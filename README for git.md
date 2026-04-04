# M-PRO: README "для дураков"

## Что это
- Основной файл сайта: `mpro.html`
- Второй файл сайта: `mpro_ss.html`
- Основной адрес: `https://mpro7.ru`
- Второй адрес: `https://mpro7.ru/ss/`
- Серверная папка: `/var/www/mpro7.ru`
- Автодеплой уже настроен через GitHub Actions.

## Самый простой рабочий процесс
### Основное приложение
1. Открой `mpro.html` и внеси правки.
2. В терминале выполни:

```bash
git add mpro.html
git commit -m "fix: кратко что изменил"
git push
```

3. Зайди в GitHub -> `Actions` -> `Deploy mpro7.ru`.
4. Если статус `Success`, открой `https://mpro7.ru` и нажми `Ctrl+F5`.

Готово.

### Приложение `/ss`
1. Открой `mpro_ss.html` и внеси правки.
2. В терминале выполни:

```bash
git add mpro_ss.html
git commit -m "fix: кратко что изменил в ss"
git push
```

3. Зайди в GitHub -> `Actions` -> `Deploy mpro7.ru /ss`.
4. Если статус `Success`, открой `https://mpro7.ru/ss/` и нажми `Ctrl+F5`.

Готово.

## Важно
- Автодеплой запускается при изменении:
  - `mpro.html`
  - `.github/workflows/deploy.yml`
- Для `/ss` автодеплой запускается при изменении:
  - `mpro_ss.html`
  - `.github/workflows/deploy-ss.yml`
- Если изменить только другие файлы, нужный деплой не стартует (это нормально).

## Как понять, что деплой прошел
- В `Actions` у запуска зеленая галочка.
- На сайте после `Ctrl+F5` видно новые изменения.

## Быстрый откат (если сломал сайт)
Откат основного сайта на предыдущую версию (`bmw.html.bak`):

```bash
ssh root@147.45.163.242 "cp /var/www/mpro7.ru/bmw.html.bak /var/www/mpro7.ru/bmw.html"
```

После этого обнови страницу сайта.

Откат `/ss` на предыдущую версию (`index.html.bak`):

```bash
ssh root@147.45.163.242 "cp /var/www/mpro7.ru/ss/index.html.bak /var/www/mpro7.ru/ss/index.html"
```

После этого обнови страницу `https://mpro7.ru/ss/`.

## Ручная загрузка (если Actions временно не работает)
С Windows:

```bash
scp "C:\Users\maks\Desktop\m-pro\mpro.html" root@147.45.163.242:/var/www/mpro7.ru/bmw.html
```

Для `/ss`:

```bash
scp "C:\Users\maks\Desktop\m-pro\mpro_ss.html" root@147.45.163.242:/var/www/mpro7.ru/ss/index.html
```

## Где лежит автодеплой
- Основной workflow: `.github/workflows/deploy.yml`
- Он:
  - загружает `mpro.html` как `bmw.html.new`
  - делает бэкап старого в `bmw.html.bak`
  - атомарно заменяет рабочий файл `bmw.html`
- Workflow для `/ss`: `.github/workflows/deploy-ss.yml`
- Он:
  - загружает `mpro_ss.html` как `ss/index.html.new`
  - делает бэкап старого в `ss/index.html.bak`
  - атомарно заменяет рабочий файл `ss/index.html`

## Секреты GitHub (уже должны быть)
- `SERVER_HOST`
- `SERVER_PORT`
- `SERVER_USER`
- `SERVER_PATH`
- `SERVER_SSH_KEY`

## Если снова "не деплоится"
Проверь по порядку:
1. Был ли изменен именно `mpro.html` или `mpro_ss.html`.
2. Есть ли новый запуск в `Actions`.
3. Какая ошибка в красном шаге.
4. Корректен ли `SERVER_PORT` (обычно `22`).
5. Не протух ли SSH-ключ в `SERVER_SSH_KEY`.
