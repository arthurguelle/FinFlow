#!/usr/bin/env python3
"""
FinFlow PDF Extractor
Extrai texto de faturas/boletos para otimizar tokens enviados à IA.

Uso: python3 extract.py <caminho_pdf> [senha]

Saída (stdout): JSON
  Sucesso: {"text": "...", "method": "pdfplumber|ocr|mixed", "pages": N}
  Erro:    {"error": "mensagem descritiva"}
"""

import sys
import json
import re


def _filter_lines(text: str, max_chars: int = 4000) -> str:
    """Remove ruído do texto extraído e limita o tamanho."""
    lines = text.splitlines()

    # Contagem de frequência para detectar cabeçalhos/rodapés repetidos
    freq: dict[str, int] = {}
    for line in lines:
        stripped = line.strip()
        if stripped:
            freq[stripped] = freq.get(stripped, 0) + 1

    result = []
    for line in lines:
        stripped = line.strip()

        # Remover em branco ou muito curtas
        if len(stripped) < 3:
            continue

        # Remover linhas decorativas (---, ===, ***, ___)
        if re.fullmatch(r"[-=*_]{3,}", stripped):
            continue

        # Remover linhas que aparecem 3+ vezes (cabeçalhos/rodapés de página)
        if freq.get(stripped, 0) >= 3:
            continue

        # Remover linhas que são apenas URL ou e-mail
        if re.fullmatch(r"https?://\S+|www\.\S+|\S+@\S+\.\S+", stripped):
            continue

        # Colapsar múltiplos espaços internos
        clean = re.sub(r" {2,}", " ", stripped)
        result.append(clean)

    filtered = "\n".join(result)
    return filtered[:max_chars]


def _format_table(table: list) -> str:
    """Converte tabela pdfplumber em linhas 'col1 | col2 | col3'."""
    rows = []
    for row in table:
        cells = [str(cell).strip() if cell is not None else "" for cell in row]
        # Pular linhas onde todas as células estão vazias
        if any(cells):
            rows.append(" | ".join(cells))
    return "\n".join(rows)


def extract_with_pdfplumber(pdf_path: str, password: str | None) -> tuple[str, str]:
    """
    Extrai texto usando pdfplumber.
    Retorna (texto, método) onde método é 'pdfplumber', 'ocr' ou 'mixed'.
    """
    import pdfplumber

    open_kwargs: dict = {}
    if password:
        open_kwargs["password"] = password

    pages_text: list[str] = []
    methods_used: set[str] = set()

    with pdfplumber.open(pdf_path, **open_kwargs) as pdf:
        for page in pdf.pages:
            page_parts: list[str] = []

            # 1. Extrair tabelas (prioridade — estrutura financeira)
            tables = page.extract_tables()
            for table in tables:
                formatted = _format_table(table)
                if formatted.strip():
                    page_parts.append(formatted)

            # 2. Extrair texto corrido (complementa o que não é tabela)
            raw_text = page.extract_text() or ""
            if raw_text.strip():
                page_parts.append(raw_text)

            page_combined = "\n".join(page_parts).strip()

            # 3. Fallback OCR se página sem texto útil
            if len(page_combined) < 20:
                ocr_text = _ocr_page(page)
                if ocr_text:
                    page_parts.append(ocr_text)
                    methods_used.add("ocr")
            else:
                methods_used.add("pdfplumber")

            pages_text.append("\n".join(page_parts))

    full_text = "\n\n".join(pages_text)

    if len(methods_used) > 1:
        method = "mixed"
    elif "ocr" in methods_used:
        method = "ocr"
    else:
        method = "pdfplumber"

    return full_text, method


def _ocr_page(page) -> str:
    """Converte uma página em imagem e aplica Tesseract."""
    try:
        from pdf2image import convert_from_path
        import pytesseract
        from PIL import Image

        # Renderiza a página em 200 DPI (bom trade-off qualidade/velocidade)
        images = convert_from_path(
            page.pdf.stream.name,
            dpi=200,
            first_page=page.page_number,
            last_page=page.page_number,
        )
        if not images:
            return ""

        text = pytesseract.image_to_string(images[0], lang="por")
        return text.strip()
    except Exception:
        return ""


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: extract.py <caminho_pdf> [senha]"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    password = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        raw_text, method = extract_with_pdfplumber(pdf_path, password)

        if not raw_text.strip():
            print(json.dumps({"error": "Nenhum texto extraído. O PDF pode estar corrompido ou vazio."}))
            sys.exit(1)

        filtered = _filter_lines(raw_text, max_chars=4000)

        if len(filtered.strip()) < 20:
            print(json.dumps({
                "error": (
                    "Não foi possível extrair texto útil deste PDF. "
                    "Verifique se o arquivo é uma fatura válida."
                )
            }))
            sys.exit(1)

        # Contar páginas do PDF
        import pdfplumber
        open_kwargs: dict = {}
        if password:
            open_kwargs["password"] = password
        with pdfplumber.open(pdf_path, **open_kwargs) as pdf:
            page_count = len(pdf.pages)

        print(json.dumps({"text": filtered, "method": method, "pages": page_count}))

    except Exception as ex:
        msg = str(ex)
        if "password" in msg.lower() or "encrypted" in msg.lower():
            if password:
                print(json.dumps({"error": "Senha incorreta. Verifique a senha do PDF."}))
            else:
                print(json.dumps({"error": "Este PDF está protegido por senha. Informe a senha para continuar."}))
        else:
            print(json.dumps({"error": f"Erro ao processar PDF: {msg}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
