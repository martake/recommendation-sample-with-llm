"""
Tests for RAG preprocessing module.

Run with: pytest rag/test_preprocess.py -v
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch
from preprocess import chunk_markdown, generate_embeddings


class TestChunkMarkdown:
    """Tests for markdown chunking logic."""

    def test_single_section(self):
        """Single header creates one chunk."""
        content = """# Title

This is the content of the section.
It has multiple lines."""

        chunks = chunk_markdown(content, "test")

        assert len(chunks) == 1
        assert chunks[0]["headers"] == ["Title"]
        assert "content of the section" in chunks[0]["text"]

    def test_multiple_sections(self):
        """Multiple headers create multiple chunks."""
        content = """# Section One

Content one.

# Section Two

Content two."""

        chunks = chunk_markdown(content, "test")

        assert len(chunks) == 2
        assert chunks[0]["headers"] == ["Section One"]
        assert chunks[1]["headers"] == ["Section Two"]

    def test_nested_headers(self):
        """Nested headers build header hierarchy."""
        content = """# Main

## Sub Section

Content here.

### Deep Section

More content."""

        chunks = chunk_markdown(content, "test")

        # Should have chunks for each section
        assert len(chunks) >= 2

        # Find the deep section chunk
        deep_chunk = next((c for c in chunks if "Deep Section" in str(c["headers"])), None)
        assert deep_chunk is not None
        assert "Main" in deep_chunk["headers"]
        assert "Sub Section" in deep_chunk["headers"]
        assert "Deep Section" in deep_chunk["headers"]

    def test_header_hierarchy_reset(self):
        """Lower level headers clear deeper levels."""
        content = """# H1

## H2

### H3

Content under H3.

## H2 Again

Content under H2 Again."""

        chunks = chunk_markdown(content, "test")

        # Find "H2 Again" chunk - should not include H3
        h2_again_chunk = next((c for c in chunks if "H2 Again" in str(c["headers"])), None)
        assert h2_again_chunk is not None
        assert "H3" not in h2_again_chunk["headers"]

    def test_unique_chunk_ids(self):
        """Each chunk gets a unique ID."""
        content = """# One

Text.

# Two

Text.

# Three

Text."""

        chunks = chunk_markdown(content, "doc")
        ids = [c["id"] for c in chunks]

        assert len(ids) == len(set(ids))  # All unique
        assert all(id.startswith("doc_") for id in ids)

    def test_source_preserved(self):
        """Source filename is preserved in chunks."""
        content = "# Test\n\nContent."

        chunks = chunk_markdown(content, "my_source")

        assert all(c["source"] == "my_source" for c in chunks)

    def test_empty_content(self):
        """Empty content produces no chunks."""
        chunks = chunk_markdown("", "test")
        assert len(chunks) == 0

    def test_whitespace_only(self):
        """Whitespace-only content produces no chunks."""
        chunks = chunk_markdown("   \n\n   ", "test")
        assert len(chunks) == 0

    def test_content_without_headers(self):
        """Content without headers is captured."""
        content = "Just some text without any headers."

        chunks = chunk_markdown(content, "test")

        # Should create a chunk with empty headers
        assert len(chunks) == 1
        assert chunks[0]["headers"] == []
        assert "text without any headers" in chunks[0]["text"]

    def test_h5_headers_supported(self):
        """Up to h5 headers are supported."""
        content = """# H1

## H2

### H3

#### H4

##### H5

Content at H5 level."""

        chunks = chunk_markdown(content, "test")

        h5_chunk = next((c for c in chunks if "H5" in str(c["headers"])), None)
        assert h5_chunk is not None
        assert len(h5_chunk["headers"]) == 5

    def test_preserves_code_blocks(self):
        """Code blocks in content are preserved."""
        content = """# Code Example

```python
def hello():
    print("world")
```

End of section."""

        chunks = chunk_markdown(content, "test")

        assert len(chunks) == 1
        assert "def hello():" in chunks[0]["text"]
        assert 'print("world")' in chunks[0]["text"]

    def test_preserves_lists(self):
        """Lists in content are preserved."""
        content = """# List Section

- Item 1
- Item 2
- Item 3"""

        chunks = chunk_markdown(content, "test")

        assert "Item 1" in chunks[0]["text"]
        assert "Item 2" in chunks[0]["text"]
        assert "Item 3" in chunks[0]["text"]


class TestGenerateEmbeddings:
    """Tests for embedding generation."""

    @patch('preprocess.SentenceTransformer')
    def test_returns_embeddings_array(self, mock_st_class):
        """Returns numpy array of embeddings."""
        mock_model = Mock()
        mock_model.encode.return_value = np.array([[0.1, 0.2], [0.3, 0.4]])
        mock_st_class.return_value = mock_model

        chunks = [
            {"id": "1", "source": "test", "headers": ["H1"], "text": "Text 1"},
            {"id": "2", "source": "test", "headers": ["H2"], "text": "Text 2"},
        ]

        embeddings = generate_embeddings(chunks, "test-model")

        assert isinstance(embeddings, np.ndarray)
        assert embeddings.shape == (2, 2)

    @patch('preprocess.SentenceTransformer')
    def test_includes_headers_in_text(self, mock_st_class):
        """Headers are prepended to text for embedding."""
        mock_model = Mock()
        mock_model.encode.return_value = np.array([[0.1]])
        mock_st_class.return_value = mock_model

        chunks = [
            {"id": "1", "source": "test", "headers": ["Main", "Sub"], "text": "Content"},
        ]

        generate_embeddings(chunks, "test-model")

        # Check that encode was called with header-prefixed text
        call_args = mock_model.encode.call_args[0][0]
        assert "Main > Sub" in call_args[0]
        assert "Content" in call_args[0]

    @patch('preprocess.SentenceTransformer')
    def test_handles_empty_chunks(self, mock_st_class):
        """Empty chunk list returns empty array."""
        mock_model = Mock()
        mock_model.encode.return_value = np.array([]).reshape(0, 384)
        mock_st_class.return_value = mock_model

        embeddings = generate_embeddings([], "test-model")

        assert len(embeddings) == 0

    @patch('preprocess.SentenceTransformer')
    def test_loads_specified_model(self, mock_st_class):
        """Loads the specified model name."""
        mock_model = Mock()
        mock_model.encode.return_value = np.array([[0.1]])
        mock_st_class.return_value = mock_model

        chunks = [{"id": "1", "source": "test", "headers": [], "text": "Text"}]

        generate_embeddings(chunks, "custom-model-name")

        mock_st_class.assert_called_once_with("custom-model-name")


class TestIntegration:
    """Integration tests for the full preprocessing pipeline."""

    def test_chunk_and_embed_roundtrip(self):
        """Full pipeline from markdown to embeddings."""
        content = """# Purchase Rules

Users purchase items based on color matching.

## Red Items

Users with high R values buy red items.

## Green Items

Users with high G values buy green items."""

        chunks = chunk_markdown(content, "rules")

        # Verify chunking
        assert len(chunks) >= 2
        assert any("Purchase Rules" in c["headers"] for c in chunks)
        assert any("Red Items" in str(c["headers"]) for c in chunks)

        # Embeddings would require actual model, skip in unit tests
        # In real integration test, would verify embedding dimensions

    def test_japanese_content(self):
        """Handles Japanese content correctly."""
        content = """# 購買ルール

ユーザーは色マッチングに基づいてアイテムを購入します。

## 赤いアイテム

R値が高いユーザーは赤いアイテムを購入します。"""

        chunks = chunk_markdown(content, "rules_ja")

        assert len(chunks) >= 1
        assert any("購買ルール" in c["headers"] for c in chunks)
        assert any("色マッチング" in c["text"] for c in chunks)

    def test_mixed_language_content(self):
        """Handles mixed language content."""
        content = """# Overview

This section is in English.

## 概要

このセクションは日本語です。"""

        chunks = chunk_markdown(content, "mixed")

        assert len(chunks) == 2
        assert any("English" in c["text"] for c in chunks)
        assert any("日本語" in c["text"] for c in chunks)
