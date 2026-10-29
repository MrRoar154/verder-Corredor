"""Genera VerdeCorredor-Proyecto-de-Aula.docx a partir de la plantilla institucional.

La plantilla original no se modifica. El archivo de salida es un .docx normal,
editable en Word.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parents[1]
PLANTILLA = ROOT / "Plantilla_Proyectos_de_Aula (1) (3).docx"
SALIDA = ROOT / "VerdeCorredor-Proyecto-de-Aula.docx"

VERDE = RGBColor(0x14, 0x53, 0x2D)


def estilo_run(run, size=12, bold=False, italic=False, color=None):
    run.bold = bold
    run.italic = italic
    run.font.name = "Arial"
    run.font.size = Pt(size)
    if color is not None:
        run.font.color.rgb = color
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.find(qn("w:rFonts"))
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.append(r_fonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs"):
        r_fonts.set(qn(attr), "Arial")


def insert_after(paragraph: Paragraph, blocks: list[dict]) -> Paragraph:
    """Inserta párrafos inmediatamente después de `paragraph`, en ese orden.

    Cada bloque es {"text": str} o {"runs": [(texto, italic, bold), ...]}.
    style: Normal | List Bullet. Opcional: hang=True para referencias.
    """
    anchor = paragraph._p
    last = paragraph
    for block in blocks:
        new_p = OxmlElement("w:p")
        anchor.addnext(new_p)
        anchor = new_p
        para = Paragraph(new_p, paragraph._parent)
        para.style = block.get("style", "Normal")
        fmt = para.paragraph_format
        fmt.space_after = Pt(block.get("after", 8))
        fmt.space_before = Pt(block.get("before", 2))
        fmt.line_spacing = 1.15
        if block.get("hang"):
            fmt.left_indent = Cm(1.25)
            fmt.first_line_indent = Cm(-1.25)
        if "runs" in block:
            for text, italic, bold in block["runs"]:
                run = para.add_run(text)
                estilo_run(run, size=block.get("size", 12), bold=bold, italic=italic)
        else:
            run = para.add_run(block["text"])
            estilo_run(run, size=block.get("size", 12), bold=block.get("bold", False))
        last = para
    return last


def find_para(doc: Document, prefix: str) -> Paragraph:
    for paragraph in doc.paragraphs:
        if paragraph.text.strip().startswith(prefix):
            return paragraph
    raise SystemExit(f"No se encontró el párrafo: {prefix}")


def append_text(paragraph: Paragraph, text: str, size=12):
    run = paragraph.add_run(text)
    estilo_run(run, size=size)


def reemplazar_texto(paragraph: Paragraph, text: str, size=12):
    for child in list(paragraph._p):
        if child.tag == qn("w:r"):
            paragraph._p.remove(child)
    run = paragraph.add_run(text)
    estilo_run(run, size=size)


def dejar_solo_etiqueta(paragraph: Paragraph, etiqueta: str):
    """Conserva estilo, comentarios y controles; deja la etiqueta en el primer run visible."""
    p = paragraph._p
    etiqueta_puesta = False
    for child in list(p):
        if child.tag == qn("w:sdt"):
            p.remove(child)
            continue
        if child.tag != qn("w:r"):
            continue
        if child.find(qn("w:commentReference")) is not None:
            continue
        textos = list(child.iter(qn("w:t")))
        if not etiqueta_puesta:
            if textos:
                textos[0].text = etiqueta
                for extra in textos[1:]:
                    extra.text = ""
            else:
                nodo = OxmlElement("w:t")
                nodo.set(qn("xml:space"), "preserve")
                nodo.text = etiqueta
                child.append(nodo)
            etiqueta_puesta = True
        else:
            for nodo in textos:
                nodo.text = ""
    if not etiqueta_puesta:
        run = paragraph.add_run(etiqueta)
        estilo_run(run)


def poner_valor(paragraph: Paragraph, etiqueta: str, valor: str):
    dejar_solo_etiqueta(paragraph, f"{etiqueta}: ")
    if valor:
        append_text(paragraph, valor)


def set_cell(cell, text: str, size=9, bold=False, center=False):
    paragraph = cell.paragraphs[0]
    for run in list(paragraph.runs):
        run._element.getparent().remove(run._element)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.space_before = Pt(0)
    run = paragraph.add_run(text)
    estilo_run(run, size=size, bold=bold)


def main():
    if not PLANTILLA.exists():
        raise SystemExit(f"No está la plantilla: {PLANTILLA}")
    shutil.copyfile(PLANTILLA, SALIDA)
    doc = Document(SALIDA)

    poner_valor(find_para(doc, "Nombre del Proyecto"), "Nombre del Proyecto", "VerdeCorredor")
    dejar_solo_etiqueta(find_para(doc, "Código del Proyecto"), "Código del Proyecto: ")
    dejar_solo_etiqueta(find_para(doc, "Agenda territorial"), "Agenda territorial: ")
    dejar_solo_etiqueta(
        find_para(doc, "Línea de investigación institucional"),
        "Línea de investigación institucional: ",
    )
    dejar_solo_etiqueta(
        find_para(doc, "Línea de investigación del programa"),
        "Línea de investigación del programa académico: ",
    )
    poner_valor(find_para(doc, "Programa académico"), "Programa académico", "Ingeniería de Software")
    dejar_solo_etiqueta(find_para(doc, "Asignatura"), "Asignatura: ")
    dejar_solo_etiqueta(find_para(doc, "Semestre"), "Semestre: ")
    poner_valor(find_para(doc, "NRC"), "NRC", "66987")
    poner_valor(find_para(doc, "Docente"), "Docente", "Pedro Alejandro Alomía Florez")
    poner_valor(
        find_para(doc, "Integrantes"),
        "Integrantes (Nombre – ID – Correo)",
        "Julian Esteban Chavez Zamora – 1055097 – julian.chavez-z@uniminuto.edu.co",
    )
    dejar_solo_etiqueta(find_para(doc, "Fecha de inicio"), "Fecha de inicio: ")
    dejar_solo_etiqueta(find_para(doc, "Fecha de finalización"), "Fecha de finalización: ")
    poner_valor(
        find_para(doc, "Lugar de ejecución"),
        "Lugar de ejecución",
        "Villavicencio (UNIMINUTO, Rectoría Orinoquía, Centro Universitario Villavicencio)",
    )
    dejar_solo_etiqueta(find_para(doc, "ODS relacionados"), "ODS relacionados: ")

    insert_after(
        find_para(doc, "2. Planteamiento del Problema"),
        [
            {
                "text": (
                    "Avance para la entrega del 28 de octubre de 2026. "
                    "Lo que sigue describe el problema como hipótesis: todavía no hay trabajo de campo que lo confirme."
                )
            }
        ],
    )

    insert_after(
        find_para(doc, "Contexto."),
        [
            {
                "text": (
                    "El Corredor Ecológico de Villavicencio es una vía de unos 4,3 km (4.387 m) "
                    "entre el puente del río Ocoa y el cruce El Palmar, en la Comuna 7. Tiene dos carriles, "
                    "andenes, ciclorruta, puentes y alumbrado, y funciona como salida alterna hacia la Comuna 8 "
                    "y la vía a Puerto López (Periódico del Meta, 2018). La obra la financió la Gobernación del Meta "
                    "con recursos de regalías y la ejecutó la Alcaldía. El terreno había sido un botadero; "
                    "la construcción se suspendió en 2017 y se reanudó en 2018 (Llano al Mundo, 2018). "
                    "La inversión reportada por la prensa local es de unos 29.000 millones de pesos "
                    "(Periódico del Meta, 2018)."
                )
            },
            {
                "text": (
                    "Entre 2017 y 2021 se perdió un 7 % de cobertura boscosa en el sector San Carlos "
                    "(García Galindo et al., 2024). UNIMINUTO tiene un proyecto de clúster inclusivo en el tramo 1, "
                    "vereda Barcelona (UNIMINUTO, 2022). Cormacarena opera el mega vivero La Bella, con cerca de "
                    "30 especies nativas y una producción reportada de más de 300.000 plántulas al año "
                    "(Villavo Noticias, 2022). En la ciudad hay viveros comerciales. No se ha confirmado, "
                    "con una fuente de primera mano, un vivero dentro del corredor que vaya a usar el software. "
                    "Esa confirmación corresponde al trabajo de campo."
                )
            },
        ],
    )

    insert_after(
        find_para(doc, "Causas del problema"),
        [
            {
                "text": (
                    "Hipótesis, pendiente de validar con viveros. Los negocios pequeños de plantas suelen llevar "
                    "el catálogo, las existencias y los pedidos en cuaderno, chat u hojas de cálculo, por separado. "
                    "No hay un inventario abierto de especies de Villavicencio que esos negocios puedan reutilizar. "
                    "La informalidad dificulta el paso a una herramienta de gestión. Si las visitas muestran otra "
                    "causa, el planteamiento se ajusta."
                )
            }
        ],
    )

    insert_after(
        find_para(doc, "Consecuencias del problema"),
        [
            {
                "text": (
                    "Con el registro disperso se pierden ventas, las plantas se deterioran por falta de seguimiento "
                    "y la oferta de especies nativas permanece poco visible para quien recorre el corredor o compra "
                    "en el vivero. Son consecuencias posibles, no un resultado ya medido."
                )
            }
        ],
    )

    insert_after(
        find_para(doc, "Evidencias"),
        [
            {
                "style": "List Bullet",
                "text": "Obra, longitud, localización e inversión: Periódico del Meta (2016, 2018) y Llano al Mundo (2018).",
            },
            {
                "style": "List Bullet",
                "text": "Pérdida de cobertura boscosa en San Carlos: García Galindo et al. (2024), revista Dynamikos.",
            },
            {
                "style": "List Bullet",
                "text": "Clúster inclusivo de UNIMINUTO en la vereda Barcelona: UNIMINUTO (2022).",
            },
            {
                "style": "List Bullet",
                "text": "Mega vivero La Bella y especies nativas de Cormacarena: Villavo Noticias (2022).",
            },
            {
                "style": "List Bullet",
                "text": (
                    "Antecedente de software: BioScan, trabajo de grado de divulgación ambiental "
                    "(Moreno Benavides, 2024). VerdeCorredor se ocupa de la gestión del vivero, no de la divulgación."
                ),
            },
            {
                "style": "List Bullet",
                "text": (
                    "Nombres de especies para la semilla del catálogo: lista de nombres comunes atribuida a "
                    "Cormacarena y nombres científicos de Molina Prieto y Vargas Garzón (2007), Revista Nodo. "
                    "Esas dos listas no están cruzadas todavía con una clave taxonómica."
                ),
            },
            {
                "style": "List Bullet",
                "text": (
                    "Límite: en el portal de datos abiertos no aparece un inventario de árboles de Villavicencio. "
                    "El inventario municipal de 2017 no está publicado como conjunto de datos (Decibeles, 2017)."
                ),
            },
        ],
    )

    insert_after(
        find_para(doc, "Pregunta de Investigación"),
        [
            {
                "text": (
                    "¿Cómo puede una aplicación web con interfaz gráfica y operaciones CRUD sobre PostgreSQL "
                    "apoyar a los viveros y emprendimientos verdes del Corredor Ecológico Universitario de "
                    "Villavicencio en la gestión de su catálogo de especies nativas, inventario, pedidos y "
                    "fichas de cuidado?"
                )
            }
        ],
    )

    insert_after(
        find_para(doc, "Importancia, pertinencia"),
        [
            {
                "text": (
                    "Importancia. El corredor es una obra pública extensa y tiene comunidades alrededor. "
                    "Una aplicación de gestión puede ordenar especies, existencias y pedidos de los viveros "
                    "que participen, y dejar a la mano la ficha de cuidado de cada planta."
                )
            },
            {
                "text": (
                    "Pertinencia académica. El proyecto aplica levantamiento de requisitos, modelado relacional "
                    "en SQL, desarrollo web con React y Node.js, y pruebas, sobre un problema de Villavicencio. "
                    "Se desarrolla en Ingeniería de Software, UNIMINUTO, Rectoría Orinoquía, NRC 66987, "
                    "con un solo integrante."
                )
            },
            {
                "text": (
                    "Pertinencia social. El usuario del vivero administra el catálogo, el inventario y los pedidos. "
                    "El cliente consulta especies, arma un pedido y ve la ficha de cuidado. El directorio de negocios, "
                    "la guía de formalización, el mapa y la función de adoptar un árbol quedan por fuera de este alcance "
                    "y solo se retomarían si sobra tiempo después del informe."
                )
            },
            {
                "text": (
                    "Pertinencia tecnológica. PostgreSQL permite claves foráneas, restricciones y transacciones: "
                    "un pedido puede descontar existencias sin dejar el stock en negativo. React y Node.js separan "
                    "la interfaz de la API, de modo que el catálogo se pueda seguir alimentando. Las herramientas "
                    "son libres o de plan gratuito. En la asignatura ninguna tecnología es obligatoria; "
                    "PostgreSQL y React son la elección del estudiante."
                )
            },
            {
                "text": (
                    "Impacto esperado. Software funcional con catálogo, fichas de cuidado, inventario, pedidos "
                    "y reportes simples, más el informe final. Un piloto con un vivero solo ocurre si algún negocio acepta. "
                    "En este avance la aplicación ya permite registrarse, buscar especies y editar fichas. "
                    "Inventario y pedidos están modelados en la base y todavía no tienen pantallas."
                )
            },
        ],
    )

    insert_after(
        find_para(doc, "Objetivo General"),
        [
            {
                "text": (
                    "Desarrollar una aplicación web con interfaz gráfica en React y operaciones CRUD sobre "
                    "PostgreSQL que permita a los viveros y a sus clientes gestionar el catálogo de especies nativas, "
                    "el inventario, los pedidos y las fichas de cuidado."
                )
            }
        ],
    )

    insert_after(
        find_para(doc, "Objetivos Específicos"),
        [
            {
                "style": "List Bullet",
                "text": (
                    "Caracterizar, con trabajo de campo, los viveros y emprendimientos del corredor y la forma "
                    "en que registran hoy el catálogo, el inventario y los pedidos."
                ),
            },
            {
                "style": "List Bullet",
                "text": (
                    "Definir los requisitos y diseñar el modelo relacional en PostgreSQL y las pantallas del alcance."
                ),
            },
            {
                "style": "List Bullet",
                "text": (
                    "Implementar la aplicación (React en el frontend y Node.js en el backend) con CRUD de especies, "
                    "inventario, pedidos y fichas de cuidado, búsqueda de nombres sin depender de tildes ni mayúsculas, "
                    "y carga de nombres científicos desde la API pública de GBIF."
                ),
            },
            {
                "style": "List Bullet",
                "text": (
                    "Evaluar la aplicación con pruebas funcionales y de usabilidad y, si un vivero acepta, con un piloto; "
                    "documentar los resultados y el manual de usuario."
                ),
            },
        ],
    )

    marco = find_para(doc, "En este apartado se registran")
    # El párrafo de instrucción de la plantilla se reemplaza por el primer bloque del marco.
    for child in list(marco._p):
        if child.tag == qn("w:r"):
            marco._p.remove(child)
    run = marco.add_run("Antecedentes")
    estilo_run(run, size=12, bold=True, color=VERDE)

    insert_after(
        marco,
        [
            {
                "text": (
                    "El corredor ecológico de Villavicencio es infraestructura pública reciente, construida sobre "
                    "un antiguo botadero y asociada a siembras de compensación (Llano al Mundo, 2018; "
                    "Periódico del Meta, 2018). García Galindo et al. (2024) reportan pérdida de cobertura boscosa "
                    "en San Carlos entre 2017 y 2021. UNIMINUTO interviene el tramo de la vereda Barcelona con un "
                    "proyecto de clúster inclusivo (UNIMINUTO, 2022). Cormacarena produce especies nativas en el "
                    "mega vivero La Bella (Villavo Noticias, 2022)."
                )
            },
            {
                "text": (
                    "En software, el antecedente cercano es BioScan, un trabajo de grado de UNIMINUTO orientado a la "
                    "divulgación ambiental (Moreno Benavides, 2024). VerdeCorredor no repite ese enfoque: registra "
                    "el trabajo del vivero (qué especie hay, cuántas unidades, qué pedido está pendiente) y muestra "
                    "la ficha de cuidado a quien compra."
                )
            },
            {
                "runs": [
                    ("Conceptos", False, True),
                ],
                "before": 10,
            },
            {
                "text": "Especie nativa, en este proyecto",
            },
        ],
    )

    # El último párrafo de especies científicas se reescribe con itálicas.
    # Se localiza por el arranque único y se sustituye.
    especie_para = find_para(doc, "Especie nativa, en este proyecto")
    for child in list(especie_para._p):
        if child.tag == qn("w:r"):
            especie_para._p.remove(child)
    intro = (
        "Especie nativa, en este proyecto, es la planta propia de la región que el vivero ofrece o que "
        "las fuentes locales recomiendan para Villavicencio. La semilla inicial del catálogo usa dos listas "
        "publicadas, todavía sin cruzar. Nombres comunes atribuidos a Cormacarena: ocobo, algarrobo, balso, "
        "guácimo, yopo, flor amarillo, caracolí, matarratón, cedro rosado, gualanday y cañafístula "
        "(Villavo Noticias, 2022). Nombres científicos de Molina Prieto y Vargas Garzón (2007): "
    )
    run = especie_para.add_run(intro)
    estilo_run(run)
    cientificos = [
        "Ceiba pentandra",
        "Hymenaea courbaril",
        "Tabebuia rosea",
        "Brownea ariza",
        "Cecropia peltata",
        "Anacardium excelsum",
        "Crescentia cujete",
    ]
    for index, nombre in enumerate(cientificos):
        run = especie_para.add_run(nombre)
        estilo_run(run, italic=True)
        separador = " y " if index == len(cientificos) - 2 else ("" if index == len(cientificos) - 1 else ", ")
        if separador:
            run = especie_para.add_run(separador)
            estilo_run(run)
    cierre = (
        ". Las fichas de luz, riego, suelo y plagas no se inventan: quedan vacías hasta que exista una fuente "
        "técnica o el saber del vivero, siempre citado."
    )
    run = especie_para.add_run(cierre)
    estilo_run(run)

    insert_after(
        especie_para,
        [
            {
                "text": (
                    "Vivero, aquí, es el negocio que produce o vende plantas y necesita saber qué tiene disponible. "
                    "Cliente es la persona que consulta el catálogo y hace un pedido. Administrador es quien mantiene "
                    "el catálogo base de especies. Esos tres roles quedan en el modelo desde esta versión."
                )
            },
            {
                "text": (
                    "CRUD nombra las operaciones crear, consultar, actualizar y eliminar. En una base relacional "
                    "como PostgreSQL se expresan con INSERT, SELECT, UPDATE y DELETE sobre tablas ligadas por "
                    "claves foráneas. El inventario y los pedidos necesitan esa integridad: la cantidad no puede "
                    "quedar negativa y cada línea de pedido pertenece a un pedido. PostgreSQL ofrece transacciones "
                    "para que el descuento de stock y el alta del pedido ocurran juntos o no ocurran."
                )
            },
            {
                "text": (
                    "La ficha de cuidado es la descripción de luz, riego, suelo, trasplante y plagas de una especie. "
                    "Va uno a uno con la especie y guarda la fuente de donde salió el dato. La búsqueda del catálogo "
                    "ignora tildes, eñes y mayúsculas mediante las extensiones unaccent y pg_trgm, para que "
                    "«guacimo» encuentre «guácimo»."
                )
            },
            {
                "runs": [("Referentes normativos y metodológicos", False, True)],
                "before": 10,
            },
            {
                "text": (
                    "Los datos de las personas (nombre, correo y contraseña) se tratan con consentimiento, "
                    "en el marco de la Ley 1581 de 2012, de protección de datos personales. Falta revisar en la "
                    "fuente oficial la fecha exacta, el título completo y el enlace de la Secretaría del Senado; "
                    "esa revisión queda pendiente en las referencias. No se publican precios ni datos de un negocio "
                    "sin permiso de quien los aporta."
                )
            },
            {
                "text": (
                    "El estudio se apoya en un enfoque mixto, de tipo aplicado y descriptivo, con diseño no "
                    "experimental, siguiendo a Hernández-Sampieri y Mendoza (2018). La cita del libro debe completarse "
                    "con ciudad, editorial verificada y edición; la ficha de trabajo no trae URL. El desarrollo "
                    "sigue sprints de dos semanas, con Scrum adaptado a una sola persona (Schwaber y Sutherland, 2020)."
                )
            },
        ],
    )

    append_text(
        find_para(doc, "Enfoque."),
        " Mixto: entrevistas y observación en los viveros, y registros de uso de la aplicación "
        "(Hernández-Sampieri y Mendoza, 2018; completar datos de edición).",
    )
    append_text(
        find_para(doc, "Tipo de investigación."),
        " Aplicada y descriptiva. Busca construir una solución y describir cómo gestionan hoy la información los viveros.",
    )
    append_text(
        find_para(doc, "Diseño metodológico."),
        " No experimental, más desarrollo iterativo. Sprints de dos semanas. Scrum adaptado a un integrante "
        "(Schwaber y Sutherland, 2020).",
    )
    append_text(
        find_para(doc, "Población y muestra."),
        " Viveros y emprendimientos verdes del corredor. Muestra por conveniencia y bola de nieve: entre 3 y 5 "
        "negocios y al menos un vivero piloto, buscados con el clúster de UNIMINUTO en la vereda Barcelona. "
        "Si en el corredor no aparece ningún negocio, la búsqueda se amplía a viveros de Villavicencio.",
    )
    append_text(
        find_para(doc, "Técnicas e instrumentos."),
        " Revisión documental, entrevista semiestructurada, observación, encuesta de necesidades y casos de prueba. "
        "Los formatos de entrevista y encuesta se anexan cuando estén diseñados. Este avance no los aplicó.",
    )
    append_text(
        find_para(doc, "Fases del proyecto."),
        " Delimitación documental; instrumentos y trabajo de campo; requisitos, modelo relacional y arquitectura; "
        "construcción por sprints (catálogo y fichas, inventario, pedidos y reportes); pruebas; piloto si hay vivero; "
        "manual e informe final.",
    )
    append_text(
        find_para(doc, "Consideraciones éticas."),
        " Consentimiento para tratar datos personales (Ley 1581 de 2012; revisar enlace oficial). "
        "Las fichas de cuidado solo se diligencian con fuente identificable. No se inventan negocios ni precios. "
        "Este avance no recoge datos de terceras personas.",
    )

    actividades = [
        ("Revisión documental y delimitación", {1, 2}),
        ("Avance: documento y aplicación base", {2}),
        ("Diseño de instrumentos", {2, 3}),
        ("Contacto con el clúster e identificación de viveros", {3, 4, 5}),
        ("Entrevistas y observación", {4, 5, 6}),
        ("Requisitos e historias de usuario", {6, 7}),
        ("Aprendizaje de SQL, Prisma y React", {5, 6, 7, 8}),
        ("Modelo relacional PostgreSQL y arquitectura", {7, 8}),
        ("Validación de la interfaz con un vivero", {8, 9}),
        ("Catálogo, búsqueda y nombres desde GBIF", {9, 10}),
        ("Inventario y alerta de stock bajo", {11, 12}),
        ("Pedidos y reportes", {12, 13}),
        ("Pruebas funcionales y de usabilidad", {11, 12, 13, 14}),
        ("Piloto con un vivero y despliegue", {14, 15}),
        ("Manual de usuario y documentación", {14, 15}),
        ("Informe final y sustentación", {15, 16}),
    ]
    tabla = doc.tables[0]
    if len(tabla.rows) < 2 + len(actividades):
        raise SystemExit("La tabla del cronograma no tiene filas suficientes")
    for offset, (nombre, semanas) in enumerate(actividades):
        row = tabla.rows[offset + 2]
        set_cell(row.cells[0], nombre, size=8)
        for semana in range(1, 17):
            set_cell(row.cells[semana], "X" if semana in semanas else "", size=9, bold=True, center=True)

    nota_cronograma = find_para(doc, "9. Recursos")._p
    bloque_nota = OxmlElement("w:p")
    nota_cronograma.addprevious(bloque_nota)
    nota = Paragraph(bloque_nota, find_para(doc, "9. Recursos")._parent)
    nota.style = "Normal"
    nota.paragraph_format.space_after = Pt(8)
    nota.paragraph_format.space_before = Pt(6)
    run = nota.add_run(
        "La semana 1 es el inicio de clases. Esa fecha sigue en blanco en la portada, así que el cuadro "
        "no trae fechas de calendario. Cada X es una semana de trabajo. El directorio de negocios, "
        "el mapa y adoptar un árbol no entran en estas dieciséis semanas."
    )
    estilo_run(run, size=11)

    append_text(
        find_para(doc, "Humanos."),
        " Julian Esteban Chavez Zamora, en todas las fases. El docente Pedro Alejandro Alomía Florez, como asesor. "
        "Viveros participantes: por confirmar.",
    )
    append_text(
        find_para(doc, "Tecnológicos."),
        " Computador portátil, internet, editor de código, Git, Node.js, React, Vite, Prisma y PostgreSQL 16 "
        "(Docker en el computador del estudiante). En una fase posterior, la API pública de GBIF para completar "
        "nombres científicos. No hay licencias de pago.",
    )
    append_text(
        find_para(doc, "Materiales."),
        " Papelería para instrumentos de campo y transporte a las visitas. En este avance no se han hecho visitas.",
    )
    append_text(
        find_para(doc, "Institucionales."),
        " Asesoría del docente y salas de informática de UNIMINUTO, Centro Universitario Villavicencio.",
    )

    insert_after(
        find_para(doc, "Relacione los costos"),
        [
            {
                "text": (
                    "El estudiante no ejecuta presupuesto en dinero de UNIMINUTO: esa columna queda en N/A. "
                    "Los montos en especie son supuestos para cuatro meses. Impresión y papelería, $60.000; "
                    "transporte de seis a ocho visitas, $100.000. El computador se estima con un equipo de "
                    "$2.500.000, vida útil de tres años y cuatro meses de uso (cerca de $280.000), más internet "
                    "($160.000) y celular ($60.000). La hora de asesoría se supuso en $50.000 y hay que confirmarla. "
                    "La sala se supuso en $20.000 por hora, 32 horas. El software libre queda en $0."
                )
            }
        ],
    )

    presupuesto = doc.tables[1]
    en_especie = {
        "Materiales e insumos": "$160.000",
        "Equipos y herramientas": "$500.000",
        "Software y licencias": "$0",
        "Horas de asesoría del docente": "$800.000",
        "Uso de infraestructura": "$640.000",
        "TOTAL": "$2.100.000",
    }
    for row in presupuesto.rows:
        rubro = row.cells[0].text.strip()
        for clave, monto in en_especie.items():
            if rubro.startswith(clave):
                set_cell(row.cells[2], monto, size=10, bold=(clave == "TOTAL"))
                if clave == "TOTAL":
                    set_cell(row.cells[1], "N/A", size=10)
                break

    productos = find_para(doc, "Describa los productos")
    for child in list(productos._p):
        if child.tag == qn("w:r"):
            productos._p.remove(child)
    run = productos.add_run(
        "Productos esperados al cierre, no resultados ya terminados. "
        "La docente indicó que aquí van el informe final y el software funcional."
    )
    estilo_run(run)
    insert_after(
        productos,
        [
            {
                "style": "List Bullet",
                "text": "Informe final del proyecto de aula, con el trabajo de campo, las pruebas y la sustentación.",
            },
            {
                "style": "List Bullet",
                "text": (
                    "Software funcional VerdeCorredor: aplicación web con catálogo de especies, fichas de cuidado, "
                    "inventario, pedidos y reportes simples, sobre PostgreSQL."
                ),
            },
            {
                "text": (
                    "En este avance el software ya permite crear una cuenta, iniciar sesión, buscar especies y "
                    "editar la ficha de cuidado. El inventario y los pedidos existen en el modelo de datos y se "
                    "construyen en los sprints siguientes. La evidencia es el código del proyecto y la aplicación "
                    "corriendo en el computador; el manual de usuario se entrega con el informe final."
                )
            },
        ],
    )

    impacto = {
        "Académico": (
            "Ejercicio de requisitos, modelo relacional, desarrollo web y pruebas aplicado a un caso de Villavicencio."
        ),
        "Social": (
            "Ordenar la información de los viveros que participen y dejar visible la oferta de especies para quien compra. "
            "Depende de conseguir al menos un vivero."
        ),
        "Económico": (
            "Disminuir pérdidas por desorden de existencias y pedidos. Es un efecto esperado; este avance no lo mide."
        ),
        "Ambiental": (
            "Facilitar el registro y el cuidado de especies nativas. No reemplaza los programas de siembra de las autoridades ambientales."
        ),
    }
    for row in doc.tables[2].rows:
        etiqueta = row.cells[0].text.strip()
        if etiqueta in impacto:
            set_cell(row.cells[1], impacto[etiqueta], size=10)

    conclusiones = find_para(doc, "Principales hallazgos")
    for child in list(conclusiones._p):
        if child.tag == qn("w:r"):
            conclusiones._p.remove(child)
    run = conclusiones.add_run(
        "Este documento es un avance. No hay todavía entrevistas, observación ni pruebas con usuarios, "
        "así que no se reportan hallazgos de la intervención. Las conclusiones y los aprendizajes se redactan "
        "en el informe final, cuando existan los instrumentos aplicados, el software evaluado y, si un vivero acepta, el piloto."
    )
    estilo_run(run)

    recomendaciones = find_para(doc, "Acciones de mejora")
    for child in list(recomendaciones._p):
        if child.tag == qn("w:r"):
            recomendaciones._p.remove(child)
    run = recomendaciones.add_run(
        "Completar en la portada la asignatura, el semestre, las líneas de investigación y las fechas de inicio de clases "
        "y de entrega. Contactar al clúster de UNIMINUTO y buscar un vivero piloto antes de cerrar los requisitos. "
        "Seguir con las pantallas de inventario y pedidos sobre el modelo ya creado. Diligenciar cada ficha de cuidado "
        "solo con una fuente citada. Revisar en fuente oficial la Ley 1581 de 2012 y la ficha bibliográfica de "
        "Hernández-Sampieri y Mendoza (2018)."
    )
    estilo_run(run)

    referencias_titulo = find_para(doc, "Normas APA 7.")
    for child in list(referencias_titulo._p):
        if child.tag == qn("w:r"):
            referencias_titulo._p.remove(child)
    run = referencias_titulo.add_run("Normas APA 7. Las entradas marcadas deben completarse con la fuente en la mano.")
    estilo_run(run, italic=True)

    referencias = [
        "Decibeles. (2017). Inició inventario de árboles. https://www.decibeles.com.co/inicio-inventario-de-arboles/",
        "García Galindo et al. (2024). Análisis del impacto ambiental en el corredor ecológico. Dynamikos, 5(1). https://doi.org/10.64351/10.64351/rdynamikos.vol5.n1.art1",
        "Hernández-Sampieri, R. y Mendoza, C. P. (2018). Metodología de la investigación. McGraw-Hill. Completar ciudad, edición y verificar el año de la edición usada.",
        "Congreso de la República de Colombia. (2012). Ley 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales. Completar fecha exacta, título oficial y enlace de la Secretaría del Senado.",
        "Llano al Mundo. (2018). Así avanza la obra del corredor ecológico de Villavicencio. https://llanoalmundo.com/asi-avanza-la-obra-del-corredor-ecologico-de-villavicencio/",
        "Molina Prieto y Vargas Garzón. (2007). Árboles para Villavicencio. Revista Nodo, 2(3). https://revistas.uan.edu.co/index.php/nodo/en/article/view/372  Completar iniciales de los autores.",
        "Moreno Benavides. (2024). BioScan [Trabajo de grado, Corporación Universitaria Minuto de Dios]. https://repository.uniminuto.edu/items/0267b5cf-bf90-49d8-9a5e-cd30c5d51f21",
        "Periódico del Meta. (2016). En marcha proyecto para la construcción de corredor ecológico en Villavicencio. https://periodicodelmeta.com/en-marcha-proyecto-para-la-construccion-de-corredor-ecologico-en-villavicencio/",
        "Periódico del Meta. (2018). Inaugurado Corredor Ecológico de Villavicencio. https://periodicodelmeta.com/inaugurado-corredor-ecologico-de-villavicencio/",
        "Schwaber, K. y Sutherland, J. (2020). La guía de Scrum. https://scrumguides.org/",
        "UNIMINUTO. (2022). Proyecto Corredor Ecológico. https://www.uniminuto.edu/noticias/proyecto-corredor-ecologico",
        "Villavo Noticias. (2022). Cormacarena inauguró mega vivero en Villavicencio que producirá 300.000 plántulas al año. https://www.villavonoticias.com/cormacarena-inauguro-mega-vivero-en-villavicencio-que-producira-300-000-plantulas-al-ano/",
    ]
    insert_after(
        referencias_titulo,
        [{"text": texto, "hang": True, "after": 6, "size": 11} for texto in referencias],
    )

    reemplazar_texto(
        find_para(doc, "Diseño de encuestas"),
        "Diseño de encuestas. El formato se anexa cuando el instrumento esté diseñado. Este avance no incluye el cuestionario ni un enlace en su lugar.",
    )
    reemplazar_texto(
        find_para(doc, "Diseño de entrevistas"),
        "Diseño de entrevistas. El formato se anexa cuando la guía esté diseñada. Este avance no aplicó entrevistas.",
    )
    insert_after(
        find_para(doc, "Diagramas"),
        [
            {
                "text": (
                    "Modelo relacional de la primera versión. Las pantallas de este avance usan especies, cuidados y usuarios. "
                    "El resto queda creado para inventario y pedidos."
                )
            },
            {
                "style": "List Bullet",
                "text": "especies: nombre común, nombre científico, familia, clave GBIF, nativa, usos y fuentes.",
            },
            {
                "style": "List Bullet",
                "text": "cuidados: una ficha por especie (luz, riego, suelo, trasplante, plagas y fuente).",
            },
            {
                "style": "List Bullet",
                "text": "negocios: vivero o emprendimiento, con sector y datos de contacto.",
            },
            {
                "style": "List Bullet",
                "text": "usuarios: administrador, vivero o cliente. Quien tiene rol de vivero pertenece a un negocio.",
            },
            {
                "style": "List Bullet",
                "text": "existencias: presentación, tamaño, precio y cantidad de una especie en un negocio.",
            },
            {
                "style": "List Bullet",
                "text": "pedidos, pedido_items y pedido_historial: el pedido, sus líneas y los cambios de estado.",
            },
            {
                "style": "List Bullet",
                "text": "recordatorios: riego, siembra o poda. La pantalla queda para un corte posterior.",
            },
            {
                "text": (
                    "Un negocio tiene muchas existencias, pedidos y usuarios. Una especie tiene una ficha de cuidado "
                    "y puede aparecer en muchas existencias. Un pedido tiene muchas líneas y muchos cambios de estado."
                )
            },
        ],
    )
    reemplazar_texto(
        find_para(doc, "Planos"),
        "Planos. No aplica. El proyecto es de software y no incluye obra civil.",
    )
    reemplazar_texto(
        find_para(doc, "Código fuente"),
        "Código fuente. Se entrega con el informe final, junto con el manual. Carpetas previstas: api (Node.js) y web (React).",
    )
    reemplazar_texto(
        find_para(doc, "Manuales"),
        "Manuales. El manual de usuario se escribe al cierre, cuando inventario y pedidos tengan pantalla. No se sustituye por un enlace.",
    )
    reemplazar_texto(
        find_para(doc, "Fotografías"),
        "Fotografías. Se anexan con el trabajo de campo. Este avance no incluye fotografías.",
    )

    doc.core_properties.title = "VerdeCorredor — Proyecto de aula"
    doc.core_properties.subject = "Avance del proyecto de aula"
    doc.core_properties.author = "Julian Esteban Chavez Zamora"
    doc.core_properties.category = "Proyecto de aula"
    doc.core_properties.language = "es-CO"
    doc.save(SALIDA)
    print(SALIDA)


if __name__ == "__main__":
    main()
