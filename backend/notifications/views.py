import json
import time
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from . import pop_notifications, register_waiter, unregister_waiter


def _sse_stream(user_id):
    """
    Generator that yields SSE-formatted events for a specific user.
    Sends a heartbeat every 20 seconds to keep the connection alive.
    """
    waiter = register_waiter(user_id)
    try:
        # Initial greeting event
        yield f"event: connected\ndata: {json.dumps({'message': 'Notifications stream connected'})}\n\n"

        while True:
            # Deliver any pending notifications
            events = pop_notifications(user_id)
            for event in events:
                yield f"event: notification\ndata: {json.dumps(event)}\n\n"

            # Wait up to 20 seconds for new events or timeout for heartbeat
            waiter.wait(timeout=20)
            waiter.clear()

            # Heartbeat keep-alive
            yield f"event: heartbeat\ndata: {json.dumps({'t': int(time.time())})}\n\n"

    except GeneratorExit:
        pass
    finally:
        unregister_waiter(user_id, waiter)


def notification_stream(request):
    """
    SSE endpoint: GET /api/notifications/stream/?token=<JWT>
    Accepts token via query param (since browser EventSource cannot send headers)
    or Authorization header.
    """
    raw_token = request.GET.get('token')
    if not raw_token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            raw_token = auth_header.split(' ')[1]

    if not raw_token:
        return JsonResponse({'detail': 'Authentication token required.'}, status=401)

    try:
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(raw_token)
        user = jwt_auth.get_user(validated_token)
    except (InvalidToken, TokenError) as e:
        return JsonResponse({'detail': str(e)}, status=401)

    response = StreamingHttpResponse(
        _sse_stream(user.id),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_poll(request):
    """
    Polling fallback: GET /api/notifications/poll/
    Returns any pending notifications and clears the user's queue.
    """
    events = pop_notifications(request.user.id)
    return Response(events)
