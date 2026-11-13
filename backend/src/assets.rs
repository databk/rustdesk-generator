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

    let (file, resolved_path) = Assets::get(path)
        .map(|f| (f, path))
        .or_else(|| {
            if path.is_empty() {
                Assets::get("index.html").map(|f| (f, "index.html"))
            } else {
                None
            }
        })
        .unwrap_or_else(|| {
            let index = Assets::get("index.html").unwrap_or_else(|| {
                panic!("index.html not found in embedded assets")
            });
            (index, "index.html")
        });

    let mime = mime_guess::from_path(resolved_path).first_or_octet_stream();
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, mime.as_ref())],
        Body::from(file.data),
    )
        .into_response()
}
