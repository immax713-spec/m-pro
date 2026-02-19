#!/bin/bash
# Скрипт для проверки статуса всех сервисов

echo "🔍 Проверка статуса mpro7.ru..."
echo ""

# Проверка systemd service
echo "📦 Статус приложения:"
if systemctl is-active --quiet mpro7; then
    echo "✅ Приложение запущено"
    systemctl status mpro7 --no-pager -l | head -n 10
else
    echo "❌ Приложение не запущено"
    systemctl status mpro7 --no-pager -l | head -n 10
fi
echo ""

# Проверка nginx
echo "🌐 Статус nginx:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущен"
    systemctl status nginx --no-pager -l | head -n 5
else
    echo "❌ Nginx не запущен"
fi
echo ""

# Проверка SSL сертификата
echo "🔐 Статус SSL сертификата:"
if [ -f /etc/letsencrypt/live/mpro7.ru/fullchain.pem ]; then
    echo "✅ SSL сертификат установлен"
    sudo certbot certificates 2>/dev/null | grep -A 5 "mpro7.ru" || echo "   (детали: sudo certbot certificates)"
else
    echo "❌ SSL сертификат не найден"
fi
echo ""

# Проверка портов
echo "🔌 Проверка портов:"
if netstat -tlnp 2>/dev/null | grep -q ":5550"; then
    echo "✅ Порт 5550 (приложение) открыт"
else
    echo "❌ Порт 5550 не слушается"
fi

if netstat -tlnp 2>/dev/null | grep -q ":443"; then
    echo "✅ Порт 443 (HTTPS) открыт"
else
    echo "❌ Порт 443 не слушается"
fi

if netstat -tlnp 2>/dev/null | grep -q ":80"; then
    echo "✅ Порт 80 (HTTP) открыт"
else
    echo "⚠️  Порт 80 не слушается (может быть нормально, если только HTTPS)"
fi
echo ""

# Проверка доступности
echo "🌍 Проверка доступности:"
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5550 | grep -q "200\|301\|302"; then
    echo "✅ Приложение отвечает на localhost:5550"
else
    echo "❌ Приложение не отвечает на localhost:5550"
fi

if curl -s -o /dev/null -w "%{http_code}" https://mpro7.ru 2>/dev/null | grep -q "200\|301\|302"; then
    echo "✅ Сайт доступен по HTTPS"
else
    echo "⚠️  Сайт недоступен по HTTPS (проверьте DNS и firewall)"
fi
echo ""

# Последние логи
echo "📋 Последние 5 строк логов приложения:"
journalctl -u mpro7 -n 5 --no-pager 2>/dev/null || echo "   (логи недоступны)"
echo ""

