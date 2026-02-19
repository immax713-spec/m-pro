#!/bin/bash
# Скрипт для установки SSL сертификата для mpro7.ru
# Запускать с правами root: sudo bash setup-ssl.sh

set -e

DOMAIN="mpro7.ru"
EMAIL="admin@${DOMAIN}"  # Измените на ваш email

echo "🔐 Настройка SSL для ${DOMAIN}..."

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с правами root: sudo bash setup-ssl.sh"
    exit 1
fi

# Обновление системы
echo "📦 Обновление пакетов..."
apt-get update

# Установка certbot и nginx
echo "📦 Установка certbot и nginx..."
apt-get install -y certbot python3-certbot-nginx nginx

# Проверка, что nginx не запущен (чтобы certbot мог использовать порт 80)
if systemctl is-active --quiet nginx; then
    echo "⚠️  Nginx уже запущен, останавливаем для получения сертификата..."
    systemctl stop nginx
fi

# Создание временной конфигурации nginx для получения сертификата
echo "📝 Создание временной конфигурации nginx..."
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /var/www/html

# Временная конфигурация для certbot
cat > /etc/nginx/sites-available/${DOMAIN}-temp <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root /var/www/html;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 200 "Temporary config for SSL setup";
        add_header Content-Type text/plain;
    }
}
EOF

# Удаление старой конфигурации если есть
rm -f /etc/nginx/sites-enabled/${DOMAIN}
rm -f /etc/nginx/sites-enabled/${DOMAIN}-temp

# Создание симлинка
ln -sf /etc/nginx/sites-available/${DOMAIN}-temp /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации если есть
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации nginx
echo "🔍 Проверка конфигурации nginx..."
nginx -t

# Запуск nginx
echo "🚀 Запуск nginx..."
systemctl start nginx
systemctl enable nginx

# Получение SSL сертификата
echo "🔐 Получение SSL сертификата от Let's Encrypt..."
certbot certonly --nginx \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    || {
        echo "❌ Ошибка при получении сертификата. Убедитесь, что:"
        echo "   1. Домен ${DOMAIN} указывает на этот сервер (A-запись)"
        echo "   2. Порт 80 открыт в firewall"
        echo "   3. Nginx запущен и доступен"
        exit 1
    }

# Копирование финальной конфигурации nginx
echo "📝 Установка финальной конфигурации nginx..."
cp /mrpo/nginx-mpro7.conf /etc/nginx/sites-available/${DOMAIN}
rm -f /etc/nginx/sites-enabled/${DOMAIN}-temp
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

# Проверка конфигурации
echo "🔍 Проверка финальной конфигурации nginx..."
nginx -t

# Перезагрузка nginx
echo "🔄 Перезагрузка nginx..."
systemctl reload nginx

# Настройка автообновления сертификата
echo "⚙️  Настройка автообновления сертификата..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Проверка таймера
echo "📅 Проверка таймера автообновления..."
systemctl status certbot.timer --no-pager || true

echo ""
echo "✅ SSL сертификат успешно установлен!"
echo ""
echo "🌐 Ваш сайт доступен по адресу: https://${DOMAIN}"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Убедитесь, что Node.js приложение запущено: sudo systemctl start mpro7"
echo "   2. Проверьте статус: sudo systemctl status mpro7"
echo "   3. Проверьте логи: sudo journalctl -u mpro7 -f"
echo ""

