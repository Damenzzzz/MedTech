"""Vercel ASGI entrypoint for the primary Askhat RAG service."""

from askhat_rag.server import app

__all__ = ["app"]
