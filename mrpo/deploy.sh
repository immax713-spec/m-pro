#!/bin/bash
# Скрипт полного развёртывания приложения mpro7.ru
# Запускать с правами root: sudo bash deploy.sh

set -e

echo "🚀 Развёртывание приложения mpro7.ru..."
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с правами root: sudo bash deploy.sh"
    exit 1
fi

# Проверка Node.js
echo "🔍 Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js установлен: ${NODE_VERSION}"
fi

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите Node.js."
    exit 1
fi

# Установка прав на директорию
echo "📁 Настройка прав доступа..."
chown -R www-data:www-data /mrpo
chmod +x /mrpo/Приложение\ 1/proxy.js

# Установка systemd service
echo "⚙️  Установка systemd service..."
cp /mrpo/mpro7.service /etc/systemd/system/mpro7.service
systemctl daemon-reload
systemctl enable mpro7

# Установка SSL (если ещё не установлен)
if [ ! -f /etc/letsencrypt/live/mpro7.ru/fullchain.pem ]; then
    echo "🔐 Установка SSL сертификата..."
    bash /mrpo/setup-ssl.sh
else
    echo "✅ SSL сертификат уже установлен"
    
    # Установка конфигурации nginx
    if [ ! -f /etc/nginx/sites-available/mpro7.ru ]; then
        echo "📝 Установка конфигурации nginx..."
        cp /mrpo/nginx-mpro7.conf /etc/nginx/sites-available/mpro7.ru
        ln -sf /etc/nginx/sites-available/mpro7.ru /etc/nginx/sites-enabled/
        nginx -t
        systemctl reload nginx
    fi
fi

# Запуск приложения
echo "🚀 Запуск приложения..."
systemctl restart mpro7

# Проверка статуса
echo ""
echo "📊 Статус сервисов:"
echo ""
systemctl status mpro7 --no-pager -l || true
echo ""
systemctl status nginx --no-pager -l || true

echo ""
echo "✅ Развёртывание завершено!"
echo ""
echo "🌐 Сайт доступен по адресу: https://mpro7.ru"
echo ""
echo "📋 Полезные команды:"
echo "   • Статус приложения: sudo systemctl status mpro7"
echo "   • Логи приложения: sudo journalctl -u mpro7 -f"
echo "   • Перезапуск: sudo systemctl restart mpro7"
echo "   • Статус nginx: sudo systemctl status nginx"
echo "   • Логи nginx: sudo tail -f /var/log/nginx/mpro7-error.log"
echo ""

