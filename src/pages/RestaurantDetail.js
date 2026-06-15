import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchRestaurantDetail,
  updateRestaurant,
  uploadRestaurantFile,
} from "../api/restaurantApi";
import MediaUploadField from "../components/MediaUploadField";
import PageLayout from "../components/PageLayout";

const categoryOptions = ["한식", "중식", "일식", "양식", "분식", "카페", "디저트", "패스트푸드", "주점", "기타"];
const maxCategoryCount = 4;

const emptyRestaurant = {
  title: "",
  address: "",
  categories: [],
  phone: "",
  businessHours: "",
  introduction: "",
  exposureStatus: "draft",
  representativeImage: null,
  representativeVideo: null,
  existingRepresentativeMedia: [],
};

function RestaurantDetail() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(emptyRestaurant);
  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [formVersion, setFormVersion] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldRefs = useRef({});

  const completedMenuCount = useMemo(() => menus.filter((menu) => menu.name.trim()).length, [menus]);

  const loadRestaurant = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetchRestaurantDetail(restaurantId);
      const detail = normalizeRestaurantDetail(response);
      setRestaurant(detail.restaurant);
      setMenus(detail.menus);
      setFieldErrors({});
      setFormVersion((current) => current + 1);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "가게 상세 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  function updateRestaurantField(field, value) {
    setRestaurant((current) => ({
      ...current,
      [field]: value,
    }));
    clearFieldError(field);
  }

  function updateRestaurantFile(field, file) {
    setRestaurant((current) => ({
      ...current,
      [field]: file || null,
    }));
  }

  function toggleCategory(category) {
    clearFieldError("categories");

    setRestaurant((current) => {
      const isSelected = current.categories.includes(category);

      if (isSelected) {
        return {
          ...current,
          categories: current.categories.filter((item) => item !== category),
        };
      }

      if (current.categories.length >= maxCategoryCount) {
        setMessageType("error");
        setMessage(`카테고리는 최대 ${maxCategoryCount}개까지 선택할 수 있습니다.`);
        return current;
      }

      setMessage("");
      return {
        ...current,
        categories: [...current.categories, category],
      };
    });
  }

  function updateMenuField(index, field, value) {
    setMenus((current) =>
      current.map((menu, menuIndex) =>
        menuIndex === index
          ? {
              ...menu,
              [field]: value,
            }
          : menu
      )
    );

    if (field === "name") {
      clearFieldError(`menu-${index}-name`);
    }
  }

  function updateMenuFile(index, field, file) {
    updateMenuField(index, field, file || null);
  }

  function addMenu() {
    setMenus((current) => [
      ...current,
      {
        id: null,
        name: "",
        price: "",
        description: "",
        image: null,
        video: null,
        existingMedia: [],
      },
    ]);
  }

  function removeMenu(index) {
    setMenus((current) => current.filter((_, menuIndex) => menuIndex !== index));
  }

  function clearFieldError(field) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextFieldErrors = validateRestaurantForm(restaurant, menus);
    const firstErrorMessage = Object.values(nextFieldErrors)[0];

    if (firstErrorMessage) {
      setFieldErrors(nextFieldErrors);
      setMessageType("error");
      setMessage(firstErrorMessage);
      focusFirstInvalidField(nextFieldErrors, fieldRefs.current);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setMessageType("success");
    setMessage("가게 정보를 수정 중입니다.");

    try {
      const payload = await buildUpdatePayload(restaurant, menus);
      await updateRestaurant(restaurantId, payload);
      setMessageType("success");
      setMessage("가게 정보가 수정되었습니다.");
      await loadRestaurant();
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "가게 정보 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <PageLayout title="내 가게 상세 관리" description="등록된 가게 정보를 불러오고 있습니다.">
        <div className="board-empty">가게 상세 정보를 불러오는 중입니다.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="내 가게 상세 관리"
      description="고객에게 보일 가게 기본 정보, 메뉴, 사진과 영상을 수정합니다."
    >
      <form key={formVersion} className="stack-layout restaurant-registration" onSubmit={handleSubmit}>
        {message ? (
          <div
            className={messageType === "success" ? "api-status api-status--success" : "api-status api-status--error"}
            role={messageType === "error" ? "alert" : "status"}
            aria-live={messageType === "error" ? "assertive" : "polite"}
          >
            {message}
          </div>
        ) : null}

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">기본 정보</span>
              <h3>{restaurant.title || "가게 이름 미입력"}</h3>
            </div>
            <Link className="restaurant-text-link" to="/business/stores">
              목록으로
            </Link>
          </div>

          <div className="admin-form">
            <label className="admin-field">
              <span>
                가게 이름 <em className="field-required" aria-label="필수">*</em>
              </span>
              <input
                ref={(element) => {
                  fieldRefs.current.title = element;
                }}
                type="text"
                value={restaurant.title}
                onChange={(event) => updateRestaurantField("title", event.target.value)}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? "restaurant-detail-title-error" : undefined}
              />
              {fieldErrors.title ? (
                <small id="restaurant-detail-title-error" className="restaurant-field-error">
                  {fieldErrors.title}
                </small>
              ) : null}
            </label>

            <label className="admin-field">
              <span>
                주소 <em className="field-required" aria-label="필수">*</em>
              </span>
              <input
                ref={(element) => {
                  fieldRefs.current.address = element;
                }}
                type="text"
                value={restaurant.address}
                onChange={(event) => updateRestaurantField("address", event.target.value)}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? "restaurant-detail-address-error" : undefined}
              />
              {fieldErrors.address ? (
                <small id="restaurant-detail-address-error" className="restaurant-field-error">
                  {fieldErrors.address}
                </small>
              ) : null}
            </label>

            <fieldset
              className="admin-field restaurant-fieldset"
              aria-invalid={Boolean(fieldErrors.categories)}
              aria-describedby={
                fieldErrors.categories
                  ? "restaurant-detail-categories-error restaurant-detail-categories-hint"
                  : "restaurant-detail-categories-hint"
              }
            >
              <legend>
                카테고리 <em className="field-required" aria-label="필수">*</em>
              </legend>
              <div className="restaurant-category-grid">
                {categoryOptions.map((category) => (
                  <label key={category} className="restaurant-category-option">
                    <input
                      ref={(element) => {
                        if (category === categoryOptions[0]) {
                          fieldRefs.current.categories = element;
                        }
                      }}
                      type="checkbox"
                      checked={restaurant.categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
              <small id="restaurant-detail-categories-hint" className="restaurant-field-hint">
                최대 {maxCategoryCount}개 선택 가능
              </small>
              {fieldErrors.categories ? (
                <small id="restaurant-detail-categories-error" className="restaurant-field-error">
                  {fieldErrors.categories}
                </small>
              ) : null}
            </fieldset>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>연락처</span>
                <input
                  type="tel"
                  value={restaurant.phone}
                  onChange={(event) => updateRestaurantField("phone", event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span>영업시간</span>
                <input
                  type="text"
                  value={restaurant.businessHours}
                  onChange={(event) => updateRestaurantField("businessHours", event.target.value)}
                />
              </label>
            </div>

            <label className="admin-field">
              <span>노출 상태</span>
              <select
                value={restaurant.exposureStatus}
                onChange={(event) => updateRestaurantField("exposureStatus", event.target.value)}
              >
                <option value="draft">임시 저장</option>
                <option value="review">검수 요청</option>
                <option value="published">즉시 노출</option>
              </select>
            </label>

            <label className="admin-field">
              <span>소개</span>
              <textarea
                rows={5}
                value={restaurant.introduction}
                onChange={(event) => updateRestaurantField("introduction", event.target.value)}
              />
            </label>

            <ExistingMediaGallery
              media={restaurant.existingRepresentativeMedia}
              emptyText="등록된 대표 미디어가 없습니다."
            />

            <div className="restaurant-media-grid">
              <MediaUploadField
                label="가게 대표 이미지 추가"
                accept="image/*"
                file={restaurant.representativeImage}
                emptyText="새 이미지를 선택하지 않으면 기존 미디어를 유지합니다."
                onChange={(file) => updateRestaurantFile("representativeImage", file)}
              />

              <MediaUploadField
                label="가게 대표 동영상 추가"
                accept="video/*"
                file={restaurant.representativeVideo}
                emptyText="새 동영상을 선택하지 않으면 기존 미디어를 유지합니다."
                onChange={(file) => updateRestaurantFile("representativeVideo", file)}
                variant="video"
              />
            </div>
          </div>
        </section>

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">메뉴</span>
              <h3>대표 메뉴 {completedMenuCount}개</h3>
            </div>
            <button type="button" className="restaurant-menu-add" onClick={addMenu} disabled={isSubmitting}>
              메뉴 추가
            </button>
          </div>

          <div className="restaurant-menu-list">
            {menus.map((menu, index) => (
              <article key={menu.id || index} className="restaurant-menu-item">
                <div className="restaurant-menu-item__topline">
                  <strong>메뉴 {index + 1}</strong>
                  <button type="button" onClick={() => removeMenu(index)} disabled={isSubmitting}>
                    삭제
                  </button>
                </div>

                <div className="admin-inline-fields">
                  <label className="admin-field">
                    <span>
                      메뉴명{isMenuNameRequired(menu) ? <em className="field-required" aria-label="필수"> *</em> : null}
                    </span>
                    <input
                      ref={(element) => {
                        fieldRefs.current[`menu-${index}-name`] = element;
                      }}
                      type="text"
                      value={menu.name}
                      onChange={(event) => updateMenuField(index, "name", event.target.value)}
                      aria-invalid={Boolean(fieldErrors[`menu-${index}-name`])}
                      aria-describedby={
                        fieldErrors[`menu-${index}-name`] ? `restaurant-detail-menu-${index}-name-error` : undefined
                      }
                    />
                    {fieldErrors[`menu-${index}-name`] ? (
                      <small id={`restaurant-detail-menu-${index}-name-error`} className="restaurant-field-error">
                        {fieldErrors[`menu-${index}-name`]}
                      </small>
                    ) : null}
                  </label>

                  <label className="admin-field">
                    <span>가격</span>
                    <input
                      type="text"
                      value={menu.price}
                      onChange={(event) => updateMenuField(index, "price", event.target.value)}
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>메뉴 설명</span>
                  <textarea
                    rows={3}
                    value={menu.description}
                    onChange={(event) => updateMenuField(index, "description", event.target.value)}
                  />
                </label>

                <ExistingMediaGallery media={menu.existingMedia} emptyText="등록된 메뉴 미디어가 없습니다." />

                <div className="restaurant-media-grid">
                  <MediaUploadField
                    label="메뉴 이미지 추가"
                    accept="image/*"
                    file={menu.image}
                    emptyText="새 메뉴 이미지를 선택해 주세요."
                    onChange={(file) => updateMenuFile(index, "image", file)}
                  />

                  <MediaUploadField
                    label="메뉴 동영상 추가"
                    accept="video/*"
                    file={menu.video}
                    emptyText="새 메뉴 동영상을 선택해 주세요."
                    onChange={(file) => updateMenuFile(index, "video", file)}
                    variant="video"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="support-panel support-panel--split">
          <dl className="restaurant-summary">
            <div>
              <dt>주소</dt>
              <dd>{restaurant.address.trim() || "-"}</dd>
            </div>
            <div>
              <dt>카테고리</dt>
              <dd>{restaurant.categories.length ? restaurant.categories.join(", ") : "-"}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>{toExposureStatusLabel(restaurant.exposureStatus)}</dd>
            </div>
          </dl>

          <div className="admin-actions restaurant-submit-actions">
            <button type="button" onClick={loadRestaurant} disabled={isSubmitting}>
              다시 불러오기
            </button>
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? "수정 중" : "수정 저장"}
            </button>
          </div>
        </section>
      </form>
    </PageLayout>
  );
}

function ExistingMediaGallery({ media, emptyText }) {
  const [failedMediaUrls, setFailedMediaUrls] = useState(() => new Set());
  const visibleMedia = media.filter((item) => item.fileUrl);

  function markMediaFailed(fileUrl) {
    setFailedMediaUrls((current) => {
      if (current.has(fileUrl)) {
        return current;
      }

      const nextFailedMediaUrls = new Set(current);
      nextFailedMediaUrls.add(fileUrl);
      return nextFailedMediaUrls;
    });
  }

  if (!visibleMedia.length) {
    return (
      <div className="restaurant-existing-media restaurant-existing-media--empty">
        <span className="restaurant-existing-media__empty">{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="restaurant-existing-media">
      {visibleMedia.map((item, index) => {
        const isVideo = isVideoMedia(item);
        const typeLabel = toMediaTypeLabel(isVideo ? "video" : "image");
        const fileName = getMediaFileName(item);
        const isPreviewUnavailable = failedMediaUrls.has(item.fileUrl);

        return (
          <article className="restaurant-existing-media__card" key={item.id || item.fileUrl || index}>
            <div className="restaurant-existing-media__preview">
              {isPreviewUnavailable ? (
                <div className="restaurant-existing-media__preview-fallback" role="status">
                  <strong>미리보기 불가</strong>
                  <span>원본 파일을 열어 확인해 주세요.</span>
                </div>
              ) : isVideo ? (
                <video
                  src={item.fileUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  onError={() => markMediaFailed(item.fileUrl)}
                >
                  <a href={item.fileUrl} target="_blank" rel="noreferrer">
                    동영상 보기
                  </a>
                </video>
              ) : (
                <img
                  src={item.fileUrl}
                  alt={`${typeLabel} 미리보기`}
                  loading="lazy"
                  onError={() => markMediaFailed(item.fileUrl)}
                />
              )}
            </div>
            <div className="restaurant-existing-media__body">
              <div className="restaurant-existing-media__meta">
                <span
                  className={
                    isVideo
                      ? "restaurant-existing-media__badge restaurant-existing-media__badge--video"
                      : "restaurant-existing-media__badge"
                  }
                >
                  {typeLabel}
                </span>
                <a className="restaurant-existing-media__link" href={item.fileUrl} target="_blank" rel="noreferrer">
                  원본 열기
                </a>
              </div>
              <strong className="restaurant-existing-media__name" title={fileName}>
                {fileName}
              </strong>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function normalizeRestaurantDetail(response) {
  const payload = response?.data || response || {};
  const representativeMedia = normalizeMediaArray(payload.media).filter(
    (media) => media.usageType === "representative"
  );

  return {
    restaurant: {
      title: payload.title || payload.name || "",
      address: payload.address || "",
      categories: normalizeCategories(payload.categories),
      phone: payload.phone || "",
      businessHours: payload.businessHours || payload.business_hours || "",
      introduction: payload.introduction || "",
      exposureStatus: payload.exposureStatus || payload.exposure_status || "draft",
      representativeImage: null,
      representativeVideo: null,
      existingRepresentativeMedia: representativeMedia,
    },
    menus: normalizeMenus(payload.menus),
  };
}

function validateRestaurantForm(restaurant, menus) {
  const errors = {};

  if (!restaurant.title.trim()) {
    errors.title = "가게 이름을 입력해 주세요.";
  }

  if (!restaurant.address.trim()) {
    errors.address = "가게 주소를 입력해 주세요.";
  }

  if (restaurant.categories.length === 0) {
    errors.categories = "카테고리를 하나 이상 선택해 주세요.";
  }

  menus.forEach((menu, index) => {
    if (!menu.name.trim() && isMenuNameRequired(menu)) {
      errors[`menu-${index}-name`] = "가격, 설명, 미디어가 있는 메뉴는 메뉴명을 입력해 주세요.";
    }
  });

  return errors;
}

function focusFirstInvalidField(errors, refs) {
  const firstField = Object.keys(errors)[0];
  const target = refs[firstField];

  if (target && typeof target.focus === "function") {
    requestAnimationFrame(() => {
      target.focus();
    });
  }
}

function isMenuNameRequired(menu) {
  return Boolean(String(menu.price).trim() || menu.description.trim() || menu.image || menu.video);
}

function normalizeCategories(categories) {
  if (Array.isArray(categories)) {
    return categories;
  }

  if (typeof categories === "string" && categories) {
    return categories.split(",").map((category) => category.trim()).filter(Boolean);
  }

  return [];
}

function normalizeMenus(menus) {
  if (!Array.isArray(menus)) {
    return [];
  }

  return menus.map((menu) => ({
    id: menu.id || menu.menuId || null,
    name: menu.name || "",
    price: menu.price == null ? "" : String(menu.price),
    description: menu.description || "",
    image: null,
    video: null,
    existingMedia: normalizeMediaArray(menu.media),
  }));
}

function normalizeMediaArray(media) {
  if (!Array.isArray(media)) {
    return [];
  }

  return media.map((item) => ({
    id: item.id || item.mediaId || null,
    mediaType: item.mediaType || item.media_type || "",
    usageType: item.usageType || item.usage_type || "",
    fileUrl: item.fileUrl || item.file_url || item.url || "",
    originalName: item.originalName || item.original_name || "",
    mimeType: item.mimeType || item.mime_type || "",
    fileSizeBytes: item.fileSizeBytes || item.file_size_bytes || null,
    displayOrder: item.displayOrder ?? item.display_order ?? 0,
  }));
}

async function buildUpdatePayload(restaurant, menus) {
  const newRepresentativeMedia = await uploadMediaList([
    {
      file: restaurant.representativeImage,
      mediaType: "image",
      usageType: "representative",
      displayOrder: restaurant.existingRepresentativeMedia.length,
    },
    {
      file: restaurant.representativeVideo,
      mediaType: "video",
      usageType: "representative",
      displayOrder: restaurant.existingRepresentativeMedia.length + 1,
    },
  ]);

  const normalizedMenus = await Promise.all(
    menus
      .filter((menu) => menu.name.trim() || String(menu.price).trim() || menu.description.trim() || menu.image || menu.video)
      .map(async (menu, index) => ({
        id: menu.id || undefined,
        name: menu.name.trim(),
        price: parsePrice(menu.price),
        description: menu.description.trim(),
        displayOrder: index,
        media: [
          ...menu.existingMedia.map(toMediaPayload),
          ...(await uploadMediaList([
            {
              file: menu.image,
              mediaType: "image",
              usageType: "menu",
              displayOrder: menu.existingMedia.length,
            },
            {
              file: menu.video,
              mediaType: "video",
              usageType: "menu",
              displayOrder: menu.existingMedia.length + 1,
            },
          ])),
        ],
      }))
  );

  return {
    title: restaurant.title.trim(),
    address: restaurant.address.trim(),
    phone: restaurant.phone.trim(),
    businessHours: restaurant.businessHours.trim(),
    introduction: restaurant.introduction.trim(),
    exposureStatus: restaurant.exposureStatus,
    categories: restaurant.categories,
    media: [...restaurant.existingRepresentativeMedia.map(toMediaPayload), ...newRepresentativeMedia],
    menus: normalizedMenus,
  };
}

async function uploadMediaList(mediaItems) {
  return Promise.all(
    mediaItems
      .filter((item) => item.file)
      .map(async (item) => {
        const uploadedFile = await uploadRestaurantFile(item.file);
        const fileUrl = uploadedFile.fileUrl || uploadedFile.file_url || uploadedFile.url;

        if (!fileUrl) {
          throw new Error("파일 업로드 응답에 fileUrl이 없습니다.");
        }

        return {
          mediaType: item.mediaType,
          usageType: item.usageType,
          fileUrl,
          originalName: uploadedFile.originalName || uploadedFile.original_name || item.file.name,
          mimeType: uploadedFile.mimeType || uploadedFile.mime_type || item.file.type,
          fileSizeBytes: uploadedFile.fileSizeBytes || uploadedFile.file_size_bytes || item.file.size,
          displayOrder: item.displayOrder,
        };
      })
  );
}

function toMediaPayload(media) {
  return {
    id: media.id || undefined,
    mediaType: media.mediaType,
    usageType: media.usageType,
    fileUrl: media.fileUrl,
    originalName: media.originalName,
    mimeType: media.mimeType,
    fileSizeBytes: media.fileSizeBytes,
    displayOrder: media.displayOrder || 0,
  };
}

function parsePrice(value) {
  const normalizedValue = String(value || "").replace(/[^\d.]/g, "");

  if (!normalizedValue) {
    return null;
  }

  const price = Number(normalizedValue);
  return Number.isFinite(price) ? price : null;
}

function toExposureStatusLabel(status) {
  switch (status) {
    case "published":
      return "즉시 노출";
    case "review":
      return "검수 요청";
    case "draft":
      return "임시 저장";
    default:
      return status || "-";
  }
}

function toMediaTypeLabel(mediaType) {
  return mediaType === "video" ? "동영상" : "이미지";
}

function isVideoMedia(media) {
  return media.mediaType === "video" || String(media.mimeType || "").startsWith("video/");
}

function getMediaFileName(media) {
  if (media.originalName) {
    return media.originalName;
  }

  try {
    const url = new URL(media.fileUrl, "http://localhost");
    const fileName = url.pathname.split("/").filter(Boolean).pop();
    return fileName ? decodeURIComponent(fileName) : "업로드 미디어";
  } catch {
    const fileName = String(media.fileUrl || "").split("?")[0].split("/").filter(Boolean).pop();
    return fileName || "업로드 미디어";
  }
}

export default RestaurantDetail;
