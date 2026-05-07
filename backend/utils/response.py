from flask import jsonify


def success(data=None, message="Success", status=200):
    return jsonify({"success": True, "message": message, "data": data}), status


def error(message="Something went wrong", status=400, details=None):
    payload = {"success": False, "message": message}
    if details is not None:
        payload["details"] = details
    return jsonify(payload), status
