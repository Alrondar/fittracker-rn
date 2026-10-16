# Стиль · что вставлять ПЕРВЫМ блоком

## STYLE LOCK — идёт первым, до описания снаряда и позы

Модель уходит в фотографию, как только в промпте появляется детальная геометрия снаряда. Поэтому стилевой блок стоит в самом начале промпта, а не в конце, и не сокращается.

```
STYLE — READ FIRST AND OBEY: a stylized CGI 3D render in the visual language of a
modern fitness app illustration, semi-realistic but unmistakably RENDERED: smooth
matte shading over skin and muscle, slightly idealized anatomy, clean painted
surfaces. THIS IS NOT A PHOTOGRAPH — no camera grain, no photographic skin pores,
no real gym, no lens depth of field; not a cartoon, not a line icon.
```

Второй обязательной строкой идёт `SINGLE FRAME` (см. `prompt-kit.md`): модель иногда рисует два ракурса в одном холсте.

## Признаки, по которым кадр опознаётся как «наш»

| Элемент | Значение |
|---|---|
| Техника | 3D-рендер, полуреалистичная стилизация; не фотография, не мультяшка, не линейная иконка |
| Фон | студийный сине-серый, бесшовный, мягкий градиент и лёгкая виньетка; пол с мягкой тенью под персонажем и снарядом |
| Персонаж (женская пара) | атлетичная женщина, тёмно-русые волосы в хвосте, чёрный спортивный топ и шорты, чёрные кроссовки с белой подошвой; нейтральное собранное лицо |
| Персонаж (мужская пара) | тот же телосложение-класс и та же цветовая гамма одежды: чёрный топ-майка или футболка без рукавов, чёрные шорты, чёрные кроссовки с белой подошвой |
| Снаряд | матовый тёмно-серый металл, чёрные резиновые валики и сиденья, чёрные блины; никаких логотипов и надписей |
| Подсветка мышцы | полупрозрачное тёплое красно-оранжевое «рентгеновское» пятно, видимое сквозь кожу ровно над целевой мышцей; приглушённое, не перекрывающее соседние мышцы |
| Камера | полный силуэт с запасом; ракурс выбирает движение, а не шаблон |
| Ракурс в паре | старт и финиш — один и тот же разворот И одна и та же дистанция; зеркальный разворот или «подъезд» камеры = брак |

## Персонаж и одежда — дословный блок для промпта

Женщина:

```
SUBJECT: one adult athletic woman — dark-blonde hair in a ponytail, black sports
bra, black shorts, black sneakers with white soles, neutral focused expression.
Full body in frame: both legs, both feet, both hands, the machine, the cable and
the cuff all fully visible.
```

Мужчина (та же сцена, меняется только этот блок — одна позиция снимается с одной камеры для обоих полов):

```
SUBJECT: one adult athletic man — short hair, black sleeveless training top, black
shorts, black sneakers with white soles, neutral focused expression. Full body in
frame.
```

## Фон и окружение — дословный блок

```
ENVIRONMENT: seamless desaturated cool blue-grey studio background with soft
gradient and gentle vignette, soft floor shadow under the athlete and the machine,
matte dark-grey metal with black pads and black weight plates, no logos, no text,
no numbers, no watermark, generous air margin above the head and below the feet,
3:2 landscape composition.
```

## Формат и рамка

| Параметр | Значение |
|---|---|
| Генерация | 1536×1024 (3:2) — пропорция итогового файла |
| Итоговый файл | 850×567 (3:2), JPEG quality 88, ~45–70 КБ |
| Бокс в приложении | 330×183 при `object-fit: cover` → воздух по краям обязателен |
| Запрещено в кадре | текст, цифры, водяные знаки, UI-элементы, второй человек, обрезанные у края стопы или голова, коллаж из двух ракурсов в одном холсте |

## Именование

`<Папка>_start`, `<Папка>_finish` — женская пара; `<Папка>_start_m`, `<Папка>_finish_m` — мужская. Имя папки = английское название упражнения с пробелами через `_`. Новые названия не изобретать: переименование строки ломает поиск в справочнике.
