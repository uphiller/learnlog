from django.utils.text import slugify

from .models import Group


def make_unique_slug(name: str) -> str:
    base = slugify(name.strip(), allow_unicode=True) or "group"
    slug = base
    counter = 2
    while Group.objects.filter(slug=slug).exists():
        slug = f"{base}-{counter}"
        counter += 1
    return slug
