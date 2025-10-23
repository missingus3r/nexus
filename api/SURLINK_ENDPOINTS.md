# Surlink API Endpoints - Implementados

## Endpoints para el Perfil de Usuario

### 1. Favoritos

#### GET /api/surlink/favorites
Obtiene todos los listados favoritos del usuario autenticado.

**Autenticación**: Requerida

**Respuesta**:
```json
{
  "favorites": [
    {
      "id": "string",
      "title": "string",
      "category": "casas|autos|academy|financial",
      "subtitle": "string",
      "summary": "string",
      "price": "USD 50000",
      "location": "Montevideo",
      "url": "/surlink/listings/[id]",
      "media": "url_to_image",
      "createdAt": "2025-10-20T..."
    }
  ]
}
```

#### DELETE /api/surlink/favorites/:id
Elimina un listado de los favoritos del usuario.

**Autenticación**: Requerida

**Parámetros**:
- `id`: ID del listado a eliminar de favoritos

**Respuesta**:
```json
{
  "success": true
}
```

---

### 2. Comentarios

#### GET /api/surlink/comments
Obtiene todos los comentarios realizados por el usuario autenticado en todos los listados.

**Autenticación**: Requerida

**Respuesta**:
```json
{
  "comments": [
    {
      "id": "string",
      "listingId": "string",
      "listingTitle": "string",
      "category": "casas|autos|academy|financial",
      "text": "string",
      "content": "string",
      "createdAt": "2025-10-20T...",
      "likes": 0,
      "responses": 2,
      "listingUrl": "/surlink/listings/[id]"
    }
  ]
}
```

#### POST /api/surlink/listings/:id/comments
Crea un nuevo comentario en un listado.

**Autenticación**: Requerida

**Parámetros**:
- `id`: ID del listado

**Body**:
```json
{
  "body": "Texto del comentario"
}
```

**Respuesta**:
```json
{
  "comment": {
    "id": "string",
    "uid": "string",
    "username": "string",
    "body": "string",
    "createdAt": "2025-10-20T..."
  }
}
```

#### GET /api/surlink/listings/:id/comments
Obtiene todos los comentarios de un listado específico.

**Parámetros**:
- `id`: ID del listado

**Respuesta**:
```json
{
  "comments": [
    {
      "id": "string",
      "uid": "string",
      "username": "string",
      "body": "string",
      "createdAt": "2025-10-20T...",
      "replies": [
        {
          "id": "string",
          "uid": "string",
          "username": "string",
          "body": "string",
          "createdAt": "2025-10-20T..."
        }
      ]
    }
  ]
}
```

#### DELETE /api/surlink/listings/:listingId/comments/:commentId
Elimina un comentario (solo el autor o admin).

**Autenticación**: Requerida

**Parámetros**:
- `listingId`: ID del listado
- `commentId`: ID del comentario

**Respuesta**:
```json
{
  "success": true
}
```

---

### 3. Respuestas

#### GET /api/surlink/responses
Obtiene todas las respuestas a los comentarios del usuario autenticado.

**Autenticación**: Requerida

**Respuesta**:
```json
{
  "responses": [
    {
      "id": "string",
      "author": "string",
      "yourComment": "string",
      "text": "string",
      "content": "string",
      "createdAt": "2025-10-20T...",
      "listingTitle": "string",
      "listingUrl": "/surlink/listings/[id]"
    }
  ]
}
```

#### POST /api/surlink/listings/:listingId/comments/:commentId/replies
Crea una respuesta a un comentario.

**Autenticación**: Requerida

**Parámetros**:
- `listingId`: ID del listado
- `commentId`: ID del comentario al que se responde

**Body**:
```json
{
  "body": "Texto de la respuesta"
}
```

**Respuesta**:
```json
{
  "reply": {
    "id": "string",
    "uid": "string",
    "username": "string",
    "body": "string",
    "createdAt": "2025-10-20T..."
  }
}
```

---

## Cambios en el Modelo

### SurlinkListing Model

Se agregó soporte para respuestas anidadas en los comentarios:

```javascript
const replySchema = new mongoose.Schema({
  uid: String,
  username: String,
  body: String,
  createdAt: Date
});

const commentSchema = new mongoose.Schema({
  uid: String,
  username: String,
  body: String,
  replies: [replySchema],  // Nueva propiedad
  createdAt: Date
});
```

### Nuevos Métodos

- `surlinkListingSchema.methods.addReply(commentId, uid, username, body)`: Agrega una respuesta a un comentario específico.

---

## Notas de Implementación

1. Todos los endpoints que requieren autenticación verifican `req.session.user`.
2. Los IDs se validan con `mongoose.Types.ObjectId.isValid()`.
3. Solo se muestran listados con `status: 'active'`.
4. Los comentarios están limitados a 1000 caracteres.
5. Las categorías 'academy' y 'financial' no admiten comentarios (por regla de negocio).
6. Los usuarios solo pueden eliminar sus propios comentarios (excepto admins).

---

## Integración con Frontend

Los endpoints están diseñados para trabajar directamente con las funciones del perfil:

- `openFavoritesModal()` → GET /api/surlink/favorites
- `openCommentsModal()` → GET /api/surlink/comments
- `openResponsesModal()` → GET /api/surlink/responses
- `removeFavorite(id)` → DELETE /api/surlink/favorites/:id

Todas las funciones incluyen manejo de errores y estados de carga adecuados.
