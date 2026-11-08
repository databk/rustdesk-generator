use axum::{
    body::Body,
    http::{header, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "../frontend/out/"]
struct Assets;

pub async fn serve_static(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    let file = Assets::get(path).or_else(|| {
        if path.is_empty() {
            Assets::get("index.html")
        } else {
            None
        }
    });

    match file {
        Some(file) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            (
                StatusCode::OK,
                [(header::CONTENT_TYPE, mime.as_ref())],
                Body::from(file.data),
            )
                .into_response()
        }
        None => {
            if let Some(index) = Assets::get("index.html") {
                let mime = mime_guess::from_path("index.html").first_or_octet_stream();
                (
                    StatusCode::OK,
                    [(header::CONTENT_TYPE, mime.as_ref())],
                    Body::from(index.data),
                )
                    .into_response()
            } else {
                (StatusCode::NOT_FOUND, "Not found").into_response()
            }
        }
    }
}
