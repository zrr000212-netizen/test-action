#!/bin/bash
# Spring Boot 后端 tar.gz 出包脚本
# 用途：构建 JAR + 生成 install.md + 打包 tar.gz(时间戳精确到秒) + 上传 OBS
# 用法：./package-and-upload.sh <backend_dir> [obs_path]

set -euo pipefail

BACKEND_DIR="${1:?用法: $0 <backend_dir> [obs_path]}"
OBS_PATH="${2:-obs://obs-hd-dev-static/vmp-test/}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
STAGING="/tmp/hd-skill-backend-pkg-$$"

echo "=== Spring Boot 后端打包 ==="
echo "后端目录: $BACKEND_DIR"
echo "时间戳: $TIMESTAMP"

# 1. Maven 构建
echo "[1/4] Maven 构建 JAR..."
cd "$BACKEND_DIR"
export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk}
export PATH=$JAVA_HOME/bin:$PATH
mvn clean package -DskipTests -q

# 查找 JAR
JAR_FILE=$(find target -name "*.jar" -not -name "*-sources.jar" -not -name "*-javadoc.jar" | head -1)
if [ -z "$JAR_FILE" ]; then
    echo "✗ 未找到构建产物 JAR"
    exit 1
fi
JAR_NAME=$(basename "$JAR_FILE")
echo "  产出: $JAR_NAME"

# 2. 生成 install.md
echo "[2/4] 生成 install.md..."
mkdir -p "$STAGING"
cat > "$STAGING/install.md" << 'INSTALL_EOF'
# HD-Skill Backend 安装说明

## 环境要求
- JDK 17+
- MySQL 8.0+

## 安装步骤

1. 解压安装包：
   ```bash
   tar -xzf hd-skill-backend-<timestamp>.tar.gz
   ```

2. 设置环境变量：
   ```bash
   export DB_HOST=192.168.1.18
   export DB_PORT=3306
   export DB_NAME=rds-hd-dev-skills-db
   export DB_USER=hdskill_app
   export DB_PASSWORD=<your-password>
   export JWT_SECRET=<your-jwt-secret-at-least-32-chars>
   export ADMIN_USERNAME=admin
   export ADMIN_PASSWORD=<your-admin-password>
   # 可选
   export FRONTEND_URL=http://service-dev.topxtopx.com
   export GITCODE_TOKEN=<your-gitcode-token>
   export OBS_AK=<your-obs-ak>
   export OBS_SK=<your-obs-sk>
   ```

3. 启动服务：
   ```bash
   nohup java -jar hd-skill-backend-1.0.0.jar > app.log 2>&1 &
   ```

4. 验证服务：
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/skills
   # 期望返回 200 或 401
   ```

## Docker 部署

```bash
# 构建镜像
docker build -t hd-skill-backend .

# 运行容器
docker run -d -p 8080:8080 \
  -e DB_HOST=192.168.1.18 \
  -e DB_PORT=3306 \
  -e DB_NAME=rds-hd-dev-skills-db \
  -e DB_USER=hdskill_app \
  -e DB_PASSWORD=<password> \
  -e JWT_SECRET=<jwt-secret> \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=<admin-password> \
  hd-skill-backend
```

## 停止服务

```bash
# JAR 方式
kill $(pgrep -f 'hd-skill-backend')

# Docker 方式
docker stop <container-id>
```
INSTALL_EOF

# 3. 打包 tar.gz
echo "[3/4] 打包 tar.gz..."
PKG_NAME="hd-skill-backend-${TIMESTAMP}.tar.gz"
cp "$JAR_FILE" "$STAGING/"
[ -f "$BACKEND_DIR/Dockerfile" ] && cp "$BACKEND_DIR/Dockerfile" "$STAGING/"
[ -f "$BACKEND_DIR/pom.xml" ] && cp "$BACKEND_DIR/pom.xml" "$STAGING/"

tar -czf "/root/$PKG_NAME" -C "$STAGING" .

# 验证包内容
echo "  包内容:"
tar -tzf "/root/$PKG_NAME" | while read f; do echo "    $f"; done

PKG_SIZE=$(ls -lh "/root/$PKG_NAME" | awk '{print $5}')
echo "  包大小: $PKG_SIZE"
echo "  包路径: /root/$PKG_NAME"

# 4. 上传 OBS
echo "[4/4] 上传 OBS..."
if command -v obsutil &>/dev/null; then
    obsutil cp "/root/$PKG_NAME" "$OBS_PATH" -f
    echo "  上传目标: $OBS_PATH"
    echo "  ✓ 上传完成"
else
    echo "  obsutil 未安装，跳过 OBS 上传"
    echo "  手动上传: obsutil cp /root/$PKG_NAME $OBS_PATH -f"
fi

# 清理
rm -rf "$STAGING"

echo ""
echo "=== 打包完成 ==="
echo "包名: $PKG_NAME"
echo "路径: /root/$PKG_NAME"
echo "大小: $PKG_SIZE"
