from rest_framework.response import Response
from rest_framework.views import APIView

from board_common.internal import is_valid_internal_request

from .models import User


def user_display_name(user: User) -> str:
    return user.display_name or user.email or user.keycloak_sub


class InternalUsersView(APIView):
    authentication_classes: list = []
    permission_classes: list = []

    def get(self, request):
        if not is_valid_internal_request(request):
            return Response({"detail": "Forbidden."}, status=403)

        keycloak_subs = [
            value.strip()
            for value in request.query_params.get("keycloak_subs", "").split(",")
            if value.strip()
        ]
        if not keycloak_subs:
            return Response({"detail": "keycloak_subs is required."}, status=400)

        users = []
        for sub in keycloak_subs:
            user, _ = User.objects.get_or_create(
                keycloak_sub=sub,
                defaults={"display_name": sub},
            )
            users.append(
                {
                    "keycloak_sub": user.keycloak_sub,
                    "display_name": user_display_name(user),
                    "email": user.email,
                }
            )

        return Response({"results": users})
