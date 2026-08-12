from rest_framework import serializers

from .models import Book, BookQuote
from .utils import get_read_page


class BookListSerializer(serializers.ModelSerializer):
    read_page = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = (
            "id",
            "aladin_item_id",
            "title",
            "author",
            "cover_url",
            "isbn13",
            "publisher",
            "pub_date",
            "total_pages",
            "read_page",
            "completion_sentence",
            "created_at",
        )

    def get_read_page(self, obj: Book) -> int | None:
        return get_read_page(obj)


class BookCompletionSerializer(serializers.Serializer):
    completion_sentence = serializers.CharField(max_length=500)

    def validate_completion_sentence(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("한 문장을 입력해 주세요.")
        return value


class PeerQuoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookQuote
        fields = ("quote", "memo", "page")


class PeerBookSerializer(serializers.Serializer):
    aladin_item_id = serializers.CharField()
    title = serializers.CharField()
    author = serializers.CharField()
    cover_url = serializers.URLField()
    isbn13 = serializers.CharField()
    publisher = serializers.CharField()
    pub_date = serializers.CharField()
    total_pages = serializers.IntegerField(allow_null=True)
    reader_count = serializers.IntegerField(min_value=1)


class BookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = (
            "aladin_item_id",
            "title",
            "author",
            "cover_url",
            "isbn13",
            "publisher",
            "pub_date",
        )

    def validate_aladin_item_id(self, value: str) -> str:
        if not str(value).strip():
            raise serializers.ValidationError("aladin_item_id is required.")
        return str(value).strip()


class BookQuoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookQuote
        fields = ("id", "book", "quote", "memo", "page", "created_at", "updated_at")
        read_only_fields = ("book",)

    def validate_quote(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("인용문을 입력해 주세요.")
        return value.strip()


class BookQuoteWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookQuote
        fields = ("quote", "memo", "page")

    def validate_quote(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("인용문을 입력해 주세요.")
        return value.strip()
