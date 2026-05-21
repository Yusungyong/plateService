-- Restaurant registration schema for PostgreSQL
-- Tables:
--   1. restaurants
--   2. restaurant_categories
--   3. restaurant_menus
--   4. restaurant_media

CREATE TABLE IF NOT EXISTS restaurants (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    address VARCHAR(300) NOT NULL,
    phone VARCHAR(40),
    business_hours VARCHAR(200),
    introduction TEXT,
    exposure_status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_restaurants_exposure_status
        CHECK (exposure_status IN ('draft', 'review', 'published'))
);

CREATE TABLE IF NOT EXISTS restaurant_categories (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_restaurant_categories_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants (id)
        ON DELETE CASCADE,
    CONSTRAINT uq_restaurant_categories_restaurant_category
        UNIQUE (restaurant_id, category_code),
    CONSTRAINT chk_restaurant_categories_display_order
        CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS restaurant_menus (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2),
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_restaurant_menus_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_restaurant_menus_price
        CHECK (price IS NULL OR price >= 0),
    CONSTRAINT chk_restaurant_menus_display_order
        CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS restaurant_media (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    menu_id BIGINT,
    media_type VARCHAR(20) NOT NULL,
    usage_type VARCHAR(30) NOT NULL,
    file_url TEXT NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(120),
    file_size_bytes BIGINT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_restaurant_media_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_restaurant_media_menu
        FOREIGN KEY (menu_id)
        REFERENCES restaurant_menus (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_restaurant_media_type
        CHECK (media_type IN ('image', 'video')),
    CONSTRAINT chk_restaurant_media_usage_type
        CHECK (usage_type IN ('representative', 'menu')),
    CONSTRAINT chk_restaurant_media_menu_usage
        CHECK (
            (usage_type = 'representative' AND menu_id IS NULL)
            OR
            (usage_type = 'menu' AND menu_id IS NOT NULL)
        ),
    CONSTRAINT chk_restaurant_media_file_size
        CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    CONSTRAINT chk_restaurant_media_display_order
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_restaurants_exposure_status
    ON restaurants (exposure_status);

CREATE INDEX IF NOT EXISTS idx_restaurant_categories_restaurant_id
    ON restaurant_categories (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_categories_category_code
    ON restaurant_categories (category_code);

CREATE INDEX IF NOT EXISTS idx_restaurant_menus_restaurant_id
    ON restaurant_menus (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_media_restaurant_id
    ON restaurant_media (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_media_menu_id
    ON restaurant_media (menu_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_media_usage
    ON restaurant_media (usage_type, media_type);
