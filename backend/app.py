import logging
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes import auth_bp, tasks_bp, users_bp, health_bp

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger(__name__)


def create_app(config_class=Config) -> Flask:
    """
    Application Factory Pattern for Flask.
    Creates and configures the Flask application instance.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable Cross-Origin Resource Sharing (CORS)
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    # Register API Blueprints
    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(users_bp, url_prefix="/api/users")

    # Global Error Handlers for uniform JSON response format
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad Request", "message": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found", "message": "The requested resource was not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method Not Allowed", "message": "HTTP method not supported."}), 405

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred."}), 500

    @app.route("/")
    def index():
        return jsonify({
            "name": "TaskFlow Backend API",
            "status": "online",
            "docs": "/api/health",
            "endpoints": [
                "/api/health",
                "/api/auth/sync",
                "/api/auth/me",
                "/api/tasks",
                "/api/tasks/<id>",
                "/api/tasks/<id>/status",
                "/api/users"
            ]
        })

    return app


if __name__ == "__main__":
    app = create_app()
    logger.info(f"Starting TaskFlow API on port {Config.PORT} (Debug: {Config.DEBUG})...")
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
