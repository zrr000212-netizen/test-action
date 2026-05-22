#!/bin/bash
# Spring Boot 后端跨架构 Docker 镜像构建脚本
# 用途：在 aarch64 构建机上构建 amd64 Docker 镜像，用于华为云 CCE 部署
# 用法：./cross-arch-build.sh <jar_path> <image_tag> [jdk_url]

set -euo pipefail

JAR_PATH="${1:?用法: $0 <jar_path> <image_tag> [jdk_url]}"
IMAGE_TAG="${2:?用法: $0 <jar_path> <image_tag> [jdk_url]}"
JDK_URL="${3:-https://repo.huaweicloud.com/openjdk/17.0.2/openjdk-17.0.2_linux-x64_bin.tar.gz}"
SWR_CENTOS="swr.cn-north-4.myhuaweicloud.com/library/centos:7"
WORK_DIR="/root/cross-arch-build-$$"

echo "=== Spring Boot 跨架构 Docker 镜像构建 ==="
echo "JAR: $JAR_PATH"
echo "镜像: $IMAGE_TAG"
echo "工作目录: $WORK_DIR"

# 1. 下载 x86_64 JDK
echo "[1/7] 下载 x86_64 JDK..."
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"
wget -O jdk17-x64.tar.gz "$JDK_URL"
tar -xzf jdk17-x64.tar.gz
JDK_DIR=$(ls -d jdk-17.*)
echo "  JDK 目录: $JDK_DIR"

# 2. 提取 x86_64 CentOS 7 rootfs
echo "[2/7] 提取 x86_64 CentOS 7 rootfs..."
docker create --name centos-rootfs-$$ --platform linux/amd64 "$SWR_CENTOS" /bin/bash
docker export centos-rootfs-$$ > centos7-rootfs.tar
docker rm centos-rootfs-$$

# 3. 组装 rootfs
echo "[3/7] 组装 rootfs..."
rm -rf rootfs && mkdir -p rootfs
cd rootfs
tar -xf ../centos7-rootfs.tar
mkdir -p usr/lib/jvm app tmp
cp -a "../$JDK_DIR" usr/lib/jvm/java-17-openjdk
ln -sf /usr/lib/jvm/java-17-openjdk/bin/java usr/bin/java 2>/dev/null || true
cp "$JAR_PATH" app/app.jar
echo "  JAR 已复制: $(basename $JAR_PATH) -> app/app.jar"

# 4. 导入 Docker 镜像
echo "[4/7] 导入 Docker 镜像..."
cd "$WORK_DIR"
tar -cf rootfs.tar -C rootfs .
docker import rootfs.tar "$IMAGE_TAG"

# 5. 设置 ENTRYPOINT
echo "[5/7] 设置 ENTRYPOINT..."
docker create --name tmp-entry-$$ "$IMAGE_TAG" java -jar /app/app.jar
docker commit -c 'ENTRYPOINT ["java", "-jar", "/app/app.jar"]' -c 'EXPOSE 8080' tmp-entry-$$ "$IMAGE_TAG"
docker rm tmp-entry-$$

# 6. 修正架构标签 (arm64 -> amd64)
echo "[6/7] 修正架构标签 arm64 -> amd64..."
docker save "$IMAGE_TAG" -o image.tar
mkdir -p img-fix
tar -xf image.tar -C img-fix

python3 - <<'PYEOF'
import json, hashlib, os

img_dir = os.environ.get("WORK_DIR", ".") + "/img-fix"
for f in os.listdir(img_dir):
    if f.endswith('.json') and f not in ('manifest.json', 'repositories'):
        path = os.path.join(img_dir, f)
        with open(path) as fh:
            config = json.load(fh)
        if config.get('architecture') == 'arm64':
            config['architecture'] = 'amd64'
            new_content = json.dumps(config)
            new_hash = hashlib.sha256(new_content.encode()).hexdigest()
            new_path = os.path.join(img_dir, f"{new_hash}.json")
            os.rename(path, new_path)
            with open(new_path, 'w') as fh:
                fh.write(new_content)
            # 更新 manifest.json
            manifest_path = os.path.join(img_dir, "manifest.json")
            with open(manifest_path) as fh:
                manifest = json.load(fh)
            for entry in manifest:
                entry['Config'] = f"{new_hash}.json"
            with open(manifest_path, 'w') as fh:
                json.dump(manifest, fh)
            print(f"  架构标签已修正: {f} -> {new_hash}.json")
            break
else:
    print("  未找到需要修正的架构标签（可能已经是 amd64）")
PYEOF

tar -cf image-fixed.tar -C img-fix .
docker load -i image-fixed.tar

# 7. 验证
echo "[7/7] 验证镜像..."
ARCH=$(docker inspect "$IMAGE_TAG" --format='{{.Architecture}}')
SIZE=$(docker inspect "$IMAGE_TAG" --format='{{.Size}}' | awk '{printf "%.1f MB", $1/1048576}')
echo ""
echo "=== 构建完成 ==="
echo "镜像: $IMAGE_TAG"
echo "架构: $ARCH"
echo "大小: $SIZE"
echo ""

if [ "$ARCH" = "amd64" ]; then
    echo "✓ 架构验证通过"
else
    echo "✗ 架构验证失败: 期望 amd64, 实际 $ARCH"
    exit 1
fi

# 清理
echo ""
read -p "清理临时文件? [Y/n] " -n1 -r CLEANUP
echo
if [[ ! $CLEANUP =~ ^[Nn]$ ]]; then
    rm -rf "$WORK_DIR"
    echo "临时文件已清理"
fi
