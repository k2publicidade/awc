# -*- coding: utf-8 -*-
import json
import sys
from pypdf import PdfReader

def extract_pdf(pdf_path, output_json_path):
    reader = PdfReader(pdf_path)
    pages_text = []
    metadata = {}
    
    if reader.metadata:
        for k, v in reader.metadata.items():
            key = str(k).replace('/', '').strip()
            metadata[key] = str(v) if v else ''
            
    full_text_list = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ''
        pages_text.append({
            'page': idx + 1,
            'text': text
        })
        full_text_list.append(text)
        
    result = {
        'num_pages': len(reader.pages),
        'metadata': metadata,
        'full_text': '\n'.join(full_text_list),
        'pages': pages_text
    }
    
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"OK {len(reader.pages)} paginas extraidas")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Uso: python extract-pdf.py <arquivo.pdf> <saida.json>")
        sys.exit(1)
    extract_pdf(sys.argv[1], sys.argv[2])
