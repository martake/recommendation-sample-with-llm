#!/usr/bin/env python3
"""
RAG Preprocessing Script
Chunks markdown documents and generates embeddings for RAG retrieval.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from sentence_transformers import SentenceTransformer


def chunk_markdown(content: str, source: str) -> List[Dict[str, Any]]:
    """
    Split markdown content into chunks by headers.
    Each chunk contains a section with its header hierarchy.
    """
    chunks = []
    lines = content.split('\n')

    current_chunk = []
    current_headers = ['', '', '', '', '']  # h1-h5
    chunk_id = 0

    for line in lines:
        # Check for headers
        header_match = re.match(r'^(#{1,5})\s+(.+)$', line)

        if header_match:
            # Save current chunk if not empty
            if current_chunk:
                text = '\n'.join(current_chunk).strip()
                if text:
                    chunks.append({
                        'id': f"{source}_{chunk_id}",
                        'source': source,
                        'headers': [h for h in current_headers if h],
                        'text': text,
                    })
                    chunk_id += 1
                current_chunk = []

            # Update header hierarchy
            level = len(header_match.group(1))
            header_text = header_match.group(2).strip()
            current_headers[level - 1] = header_text
            # Clear lower-level headers
            for i in range(level, 5):
                current_headers[i] = ''

            current_chunk.append(line)
        else:
            current_chunk.append(line)

    # Don't forget the last chunk
    if current_chunk:
        text = '\n'.join(current_chunk).strip()
        if text:
            chunks.append({
                'id': f"{source}_{chunk_id}",
                'source': source,
                'headers': [h for h in current_headers if h],
                'text': text,
            })

    return chunks


def generate_embeddings(chunks: List[Dict[str, Any]], model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Generate embeddings for each chunk using sentence-transformers.
    """
    print(f"Loading model: {model_name}")
    model = SentenceTransformer(model_name)

    # Create text for embedding (include headers for context)
    texts = []
    for chunk in chunks:
        header_prefix = ' > '.join(chunk['headers']) + '\n' if chunk['headers'] else ''
        texts.append(header_prefix + chunk['text'])

    print(f"Generating embeddings for {len(texts)} chunks...")
    embeddings = model.encode(texts, show_progress_bar=True)

    return embeddings


def main():
    import os
    # Paths - use environment variable or default
    rag_docs_dir = Path(os.environ.get('RAG_DOCS_DIR', '/app/frontend/public/rag'))
    output_dir = rag_docs_dir

    # Find all markdown files in rag docs directory
    md_files = list(rag_docs_dir.glob('*.md'))

    if not md_files:
        print(f"No markdown files found in {rag_docs_dir}")
        return

    # Process all markdown files
    all_chunks = []
    for md_file in md_files:
        print(f"Processing: {md_file.name}")
        content = md_file.read_text(encoding='utf-8')
        source = md_file.stem
        chunks = chunk_markdown(content, source)
        all_chunks.extend(chunks)
        print(f"  -> {len(chunks)} chunks")

    print(f"\nTotal chunks: {len(all_chunks)}")

    # Generate embeddings
    embeddings = generate_embeddings(all_chunks)

    # Save chunks (without embeddings for smaller file)
    chunks_output = output_dir / 'chunks.json'
    with open(chunks_output, 'w', encoding='utf-8') as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)
    print(f"\nSaved chunks to: {chunks_output}")

    # Save embeddings as separate file (numpy array -> list for JSON)
    embeddings_output = output_dir / 'embeddings.json'
    with open(embeddings_output, 'w', encoding='utf-8') as f:
        json.dump(embeddings.tolist(), f)
    print(f"Saved embeddings to: {embeddings_output}")

    # Print sample
    print("\n--- Sample chunk ---")
    if all_chunks:
        sample = all_chunks[0]
        print(f"ID: {sample['id']}")
        print(f"Headers: {sample['headers']}")
        print(f"Text preview: {sample['text'][:200]}...")


if __name__ == '__main__':
    main()
