#!/bin/bash
# Spring Boot 后端一键部署脚本：构建 → SWR推送 → CCE更新
# 用法: ./deploy.sh [backend_dir] [cce_deployment_name]
#
# 前置条件:
#   - JAVA_HOME 已配置 (JDK 17)
#   - docker 已登录 SWR
#   - CCE 证书已放置在 /root/lipeixin/ccecert/
#
# 环境变量(可选):
#   SWR_REPO    - SWR仓库地址 (默认: swr.cn-north-4.myhuaweicloud.com/swr-hd/hd-skill-backend)
#   CCE_API     - CCE API地址 (默认: https://192.168.1.214:5443)
#   CCE_CERTS   - CCE证书参数 (默认: --cacert /root/lipeixin/ccecert/ca.crt --cert /root/lipeixin/ccecert/client.crt --key /root/lipeixin/ccecert/client.key)

set -euo pipefail

BACKEND_DIR="${1:-/root/HDAgentSkillDev/backend}"
DEPLOY_NAME="${2:-hd-skill-backend}"
SWR_REPO="${SWR_REPO:-swr.cn-north-4.myhuaweicloud.com/swr-hd/hd-skill-backend}"
CCE_API="${CCE_API:-https://192.168.1.214:5443}"
CCE_CERTS="${CCE_CERTS:---cacert /root/lipeixin/ccecert/ca.crt --cert /root/lipeixin/ccecert/client.crt --key /root/lipeixin/ccecert/client.key}"
JAR_NAME="hd-skill-backend-1.0.0.jar"
SWR_CENTOS="swr.cn-north-4.myhuaweicloud.com/library/centos:7"
JDK_URL="https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/linux/OpenJDK17U-jdk_x64_linux_hotspot_17.0.19_10.tar.gz"

echo "============================================"
echo " Spring Boot 一键部署 (构建→SWR→CCE)"
echo "============================================"
echo "后端目录: $BACKEND_DIR"
echo "SWR仓库:  $SWR_REPO"
echo "CCE部署:  $DEPLOY_NAME"
echo ""

# ===== Step 1: Maven 构建 JAR =====
echo "[1/8] Maven 构建 JAR..."
cd "$BACKEND_DIR"
export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk}
export PATH=$JAVA_HOME/bin:$PATH
mvn clean package -DskipTests -q
JAR_PATH="$BACKEND_DIR/target/$JAR_NAME"
if [ ! -f "$JAR_PATH" ]; then
    echo "✗ JAR 构建失败: $JAR_PATH 不存在"
    exit 1
fi
JAR_SIZE=$(ls -lh "$JAR_PATH" | awk '{print $5}')
echo "  ✓ JAR: $JAR_PATH ($JAR_SIZE)"

# ===== Step 2: 下载 x86_64 JDK =====
echo "[2/8] 下载 x86_64 JDK..."
cd /root
if [ -f /tmp/jdk17-x64.tar.gz ]; then
    echo "  使用缓存"
    cp /tmp/jdk17-x64.tar.gz jdk17-x64.tar.gz
else
    wget -q -O jdk17-x64.tar.gz "$JDK_URL"
    cp jdk17-x64.tar.gz /tmp/jdk17-x64.tar.gz
fi
tar -xzf jdk17-x64.tar.gz
JDK_DIR=$(ls -d jdk-17.*)
echo "  ✓ JDK: $JDK_DIR"

# ===== Step 3: 提取 CentOS 7 amd64 rootfs =====
echo "[3/8] 提取 CentOS 7 amd64 rootfs..."
docker create --name centos-rootfs-deploy "$SWR_CENTOS" /bin/bash
docker export centos-rootfs-deploy > /root/centos7-rootfs.tar
docker rm centos-rootfs-deploy > /dev/null
echo "  ✓ rootfs: $(ls -lh /root/centos7-rootfs.tar | awk '{print $5}')"

# ===== Step 4: 组装 rootfs =====
echo "[4/8] 组装 rootfs..."
cd /root
rm -rf rootfs && mkdir -p rootfs
cd rootfs
tar -xf ../centos7-rootfs.tar
mkdir -p usr/lib/jvm app tmp
cp -a "../$JDK_DIR" usr/lib/jvm/java-17-openjdk
ln -sf /usr/lib/jvm/java-17-openjdk/bin/java usr/bin/java 2>/dev/null || true
cp "$JAR_PATH" app/app.jar
echo "  ✓ rootfs 组装完成"

# ===== Step 5: 导入镜像 + 修正架构 + ENTRYPOINT =====
echo "[5/8] 构建镜像 (修正架构 amd64 + ENTRYPOINT)..."
TAG=$(date +%Y%m%d%H%M%S)
IMAGE_TAG="${SWR_REPO}:${TAG}"

cd /root
tar -cf rootfs.tar -C rootfs .
docker import rootfs.tar "$IMAGE_TAG" > /dev/null

docker save "$IMAGE_TAG" -o /root/image.tar

export IMAGE_TAG  # 使python3可见
python3 - <<'PYEOF'
import json, tarfile, io, os

image_tag = os.environ.get("IMAGE_TAG")
tar_path = '/root/image.tar'
output_path = '/root/image-fixed.tar'

with tarfile.open(tar_path, 'r') as tin:
    manifest_data = json.loads(tin.extractfile('manifest.json').read())
    config_file = manifest_data[0]['Config']
    config_data = json.loads(tin.extractfile(config_file).read())

    config_data['architecture'] = 'amd64'
    config_data['config']['Entrypoint'] = ['java', '-jar', '/app/app.jar']
    config_data['config']['ExposedPorts'] = {'8080/tcp': {}}
    config_data['config']['WorkingDir'] = '/app'

    new_config_json = json.dumps(config_data, indent=2).encode('utf-8')

    with tarfile.open(output_path, 'w') as tout:
        for member in tin.getmembers():
            if member.name == config_file:
                info = tarfile.TarInfo(name=config_file)
                info.size = len(new_config_json)
                info.mode = member.mode
                info.uid = member.uid
                info.gid = member.gid
                info.mtime = member.mtime
                tout.addfile(info, io.BytesIO(new_config_json))
            else:
                tout.addfile(member, tin.extractfile(member))
PYEOF

IMAGE_TAG="${SWR_REPO}:${TAG}"  # re-read
docker rmi "$IMAGE_TAG" 2>/dev/null || true
docker load -i /root/image-fixed.tar > /dev/null

ARCH=$(docker inspect "$IMAGE_TAG" --format='{{.Architecture}}')
if [ "$ARCH" != "amd64" ]; then
    echo "  ✗ 架构验证失败: $ARCH (期望 amd64)"
    exit 1
fi
echo "  ✓ 镜像: $IMAGE_TAG (arch=$ARCH)"

# ===== Step 6: 登录 SWR + 推送 =====
echo "[6/8] 登录 SWR + 推送镜像..."
# SWR 登录（凭证有时效，每次部署前重新登录）
docker login -u cn-north-4@HST3UQPSE9SU06K4QQ26 \
  -p 6b215814cbb9a6266c14d030c19c02f574aa233273930eeab93774db15db8e07 \
  swr.cn-north-4.myhuaweicloud.com > /dev/null 2>&1
echo "  ✓ SWR 登录成功"
docker push "$IMAGE_TAG"
echo "  ✓ 推送完成"

# ===== Step 7: 更新 CCE Deployment =====
echo "[7/8] 更新 CCE Deployment..."
curl -s $CCE_CERTS \
  -X PATCH \
  -H "Content-Type: application/strategic-merge-patch+json" \
  -d "{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"$DEPLOY_NAME\",\"image\":\"$IMAGE_TAG\"}]}}}}" \
  "$CCE_API/apis/apps/v1/namespaces/default/deployments/$DEPLOY_NAME" > /dev/null
echo "  ✓ CCE 已更新"

# ===== Step 8: 验证部署 =====
echo "[8/8] 验证部署 (等待30秒)..."
sleep 30

echo ""
echo "============================================"
echo " 部署信息"
echo "============================================"

# Deployment 状态
curl -s $CCE_CERTS \
  "$CCE_API/apis/apps/v1/namespaces/default/deployments/$DEPLOY_NAME" | python3 -c "
import sys,json
d=json.load(sys.stdin)
c=d['spec']['template']['spec']['containers'][0]
s=d['status']
print(f'镜像: {c[\"image\"]}')
print(f'副本: {s[\"replicas\"]}  就绪: {s.get(\"readyReplicas\",0)}  更新: {s.get(\"updatedReplicas\",0)}  可用: {s.get(\"availableReplicas\",0)}')
"

# Pod 状态
curl -s $CCE_CERTS \
  "$CCE_API/api/v1/namespaces/default/pods" | python3 -c "
import sys,json
for p in json.load(sys.stdin)['items']:
    if 'hd-skill-backend' in p['metadata']['name']:
        s=p['status']
        cs=s.get('containerStatuses',[{}])[0]
        print(f'Pod: {p[\"metadata\"][\"name\"]}  状态: {s[\"phase\"]}  IP: {s.get(\"podIP\",\"N/A\")}  重启: {cs.get(\"restartCount\",0)}  就绪: {cs.get(\"ready\",False)}')
"

# Service 信息
curl -s $CCE_CERTS \
  "$CCE_API/api/v1/namespaces/default/services" | python3 -c "
import sys,json
for svc in json.load(sys.stdin)['items']:
    name=svc['metadata']['name']
    if 'skill' in name.lower() or 'backend' in name.lower():
        spec=svc['spec']
        ingress=svc['status'].get('loadBalancer',{}).get('ingress',[])
        ext_ip=ingress[0].get('ip','N/A') if ingress else 'N/A'
        ports=', '.join(f\"{p['port']}->{p['targetPort']}\" for p in spec['ports'])
        print(f'Service: {name}  外部IP: {ext_ip}  端口: {ports}')
"

# ===== 清理临时文件 =====
echo ""
echo "清理临时文件..."
rm -rf /root/rootfs /root/centos7-rootfs.tar /root/rootfs.tar \
       /root/image.tar /root/image-fixed.tar \
       /root/jdk17-x64.tar.gz /root/$JDK_DIR
echo "✓ 部署完成"
