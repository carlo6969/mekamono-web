# MEKAMONO · Tienda online de demostración (APARECE · Plan Destaca)

Sitio completo para reconstruir la demo que estuvo publicada en https://apareceweb.com/demos/mekamono/ (21-nov-2026).
Es un sitio estático: HTML + CSS + JavaScript sin dependencias ni compilación.

## Cómo verla en tu computadora
1. Descomprime el ZIP.
2. Abre la carpeta `mekamono/` y da doble clic en `index.html`.
   - Recomendado: servirla con un servidor local para que todo funcione igual que en línea, por ejemplo con Visual Studio Code + extensión "Live Server", o en una terminal: `npx serve mekamono`.
3. Necesita internet solo para las tipografías de Google Fonts y el mapa de Google.

## Cómo volver a publicarla en apareceweb.com
1. En hPanel → Administrador de archivos, crea la carpeta `public_html/demos/mekamono/`.
2. Sube TODO el contenido de la carpeta `mekamono/` (index.html, app.js, lab.js, productos.js e `img/` con sus subcarpetas).
3. Queda en https://apareceweb.com/demos/mekamono/
4. Ojo: si el sitio de APARECE se publica desde Git, un nuevo deploy puede borrar `public_html/demos/`. Conviene agregar `demos/` al repositorio o a la configuración del deploy para que no se pierda.

## Estructura
- `index.html` → estructura y estilos (CSS dentro de la etiqueta `<style>`). Lleva `noindex, nofollow` y la franja "Vista previa creada por APARECE · Plan Destaca".
- `app.js` → tienda: catálogo, filtros, buscador, ficha de producto, carrito → pedido por WhatsApp, horario en vivo, reseñas, agenda de visita, menú, búsqueda.
- `lab.js` → Mekamono Lab: simulador de grabado láser (canvas). Piezas, acabados, texto, fechas, íconos, foto, animación del láser, descarga PNG, carrito y cotización por WhatsApp.
- `productos.js` → catálogo de 65 productos (tomado de su Tiendanube el 21-nov-2026). Formato por producto: `id`, `n` nombre, `c` categoría, `o` nombres de opciones, `v` variantes `[opción1, opción2…, precio, precio_anterior, existencias(0-9), índice_de_foto]`, `i` fotos, `d` descripción.
- `img/` → fotos del negocio sacadas de su Instagram, logo y foto de perfil.
- `img/productos/` → fotos de producto (de su Tiendanube, 1024 px).
- `datos/catalogo.csv` → catálogo en tabla (se abre en Excel o Google Sheets).

Nota: en la versión que estuvo en línea las fotos de producto se cargaban directo del CDN de Tiendanube (`https://dcdn-us.mitiendanube.com/stores/006/418/878/products/<nombre>-640-0.webp`). En este paquete ya apuntan a `img/productos/`, así que funciona sin depender de su tienda.

## Fotos de `img/`
| Archivo | Qué es | Origen |
|---|---|---|
| logo.webp | Logotipo MEKAMONO (texto negro, fondo transparente; en la web se invierte a blanco) | Tiendanube |
| avatar.webp | Mono del logo (foto de perfil) | Instagram |
| vitrina.webp | Vitrina con collar dorado (foto principal del inicio) | IG, post "Nueva casa" 4-feb-2026 |
| letrero.webp | Letrero del nuevo local | IG, post "Nueva casa" |
| grabado.webp | Grabado láser al instante en tienda | IG, post "Nueva casa" |
| exhibidor.webp | Exhibidor de collares | IG, post "Nueva casa" |
| mono.webp | Mono de peluche con cadena | IG, post "Nueva casa" |
| fachada.webp | Fachada "Visítanos · Grabado láser 15 min" | IG, post Buen Fin 14-nov-2026 |
| hermanos.webp | Los dos hermanos fundadores | IG, post 13-oct-2026 |
| proceso-1/2/3.webp | Brazaletes grabados (fecha, números romanos, nombre) | IG, post 29-sep-2026 |
| r-*.webp | Portadas de reels (dúo, mirada, láser, cita, regalo, selfie, historia) | IG |

Reels enlazados en la web: dúo DTjtImdDGy6 · mirada DfBRy6kxxOt · láser Dfspou-zgPR · cita Dd2XXgBJdyl · regalo DeLGOlNxaph · selfie Df3hGsYzKmI · historia DW2Sw_zCep_ (https://www.instagram.com/reel/<código>/).

## Datos del negocio (consultados el 21-nov-2026)
- Nombre: MEKAMONO · Bisutería + Grabado Láser. Lema: "En Mekamono no creamos accesorios, inmortalizamos símbolos." / "Lleva contigo palabras que importan. Graba tu historia y hazla eterna."
- Dirección: Av. Revolución 503, Local C, Col. Periodistas, 42060 Pachuca de Soto, Hgo. (mismo edificio que Be Cap, Local B).
- WhatsApp y teléfono: 56 5920 6025 (wa.me/525659206025). Correo: mekamono.mx@gmail.com.
- Instagram: @mekamono (2,879 seguidores). Linktree: linktr.ee/mekamono. Tienda: mekamono.mitiendanube.com.
- Google Maps: 5.0 con 21 reseñas.
- Horario (Google): L–V 12:00–7:30 p.m. · Sáb 11:00 a.m.–7:00 p.m. · Dom 10:30 a.m.–7:00 p.m.
  Horario en su bio de IG: L–V 12:30–19:30 · S–D 11:00–19:00 (no coinciden; en la web va el de Google).
- Pagos en su tienda en línea: Visa, Mastercard, Amex, débito y OXXO.
- Personalizados: producción de 3 a 5 días hábiles en línea; en tienda graban en 15 minutos. Envíos a todo México y opción de recoger en tienda.
- Historia: dos hermanos; empezaron en Facebook, luego tianguis y bazares, primer local y en febrero de 2026 su "nueva casa" en el Local C. Historias destacadas de IG: "EXPERIENCIA 2021" y "LOCAL 2022".

### Reseñas de Google usadas
- Ame Garc (hace 9 meses): "Excelente calidad en el producto, el grabado perfecto y bien centrado. Atención y precios inmejorables."
- Moisés Pérez (hace un año): "Gran calidad de accesorios a precios 10/10 además de muy buena atención al cliente recomendable al 100"
- Jorge Luis Mondragón Espadas (hace 7 meses): "Me atendieron súper bien. Recomendación y toda la cosa. Sin duda vuelvo por unas joyas 💎💎💎🔥…" (Google la muestra recortada)
- Sus dm (hace un año): "La tienda tiene varios productos con gran variedad de diseño muy bonitos todos, además la atención que te dan es muy amable n.n"
- Osmar Duran (hace 3 meses): "Muy atentos, cordiales y excelente trabajo"

## Diseño
- Colores: negro #0a0a0b · grises #111113 / #19191c · texto #f3f0e9 · dorado #d8b26a / #f4dda6 / #a37b36 · acento lima #d9ff3f (de sus promociones en IG) · crema #f4f1ea (sección tienda y reseñas).
- Tipografías (Google Fonts): Syne (títulos), Instrument Serif itálica (palabras en dorado), Inter (texto).
- Tipografías del simulador: Great Vibes, Playfair Display, Cinzel, Montserrat, Courier Prime, UnifrakturMaguntia, Dancing Script.

## Simulador (Mekamono Lab)
Piezas y producto real del que toma el precio:
- Esclava placa → "Esclava Personalizada Texto" (Delgada/Gruesa)
- Placa militar → "Collar Placa Militar Personalizado" (Grande/Pequeño/Mini)
- Medalla → "Collar Círculo Personalizado"
- Brazalete → "Brazalete Personalizado Texto" (Delgada/Gruesa)
- Corazón → "Esclava Placa Corazón Imán Dúo"
Para cambiar piezas, precios o tipografías: arreglos `PIECES`, `FONTS` e `ICONS` al inicio de `lab.js`. Número de WhatsApp: constante `WA` en `app.js`.

## Pendientes antes de cerrar la venta
- Confirmar horario (Google vs. Instagram).
- Confirmar costo de envío (en la web dice "costo por confirmar").
- Confirmar si el grabado con foto cuesta extra y los precios de medalla y corazón.
- 40 productos de su Tiendanube no tienen foto y no se incluyeron (placa para perro, termo, destapador, etc.).
- Links de Facebook y TikTok (no se encontraron).
- Versión final: pago en línea (Mercado Pago/Stripe) o conexión con su Tiendanube.
