import React, { useMemo, useState } from "react";
import { createRestaurant, uploadRestaurantFile } from "../api/restaurantApi";
import PageLayout from "../components/PageLayout";

const emptyRestaurant = {
  name: "",
  address: "",
  categories: ["한식"],
  phone: "",
  businessHours: "",
  introduction: "",
  exposureStatus: "draft",
  representativeImage: null,
  representativeVideo: null,
};

const emptyMenu = {
  name: "",
  price: "",
  description: "",
  image: null,
  video: null,
};

const categoryOptions = ["한식", "중식", "일식", "양식", "분식", "카페", "디저트", "패스트푸드", "주점", "기타"];
const maxCategoryCount = 4;

function RestaurantRegistration() {
  const [restaurant, setRestaurant] = useState(emptyRestaurant);
  const [menus, setMenus] = useState([{ ...emptyMenu }]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [formVersion, setFormVersion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedMenuCount = useMemo(() => {
    return menus.filter((menu) => menu.name.trim()).length;
  }, [menus]);

  function updateRestaurantField(field, value) {
    setRestaurant((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateRestaurantFile(field, file) {
    setRestaurant((current) => ({
      ...current,
      [field]: file || null,
    }));
  }

  function toggleCategory(category) {
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
  }

  function updateMenuFile(index, field, file) {
    updateMenuField(index, field, file || null);
  }

  function addMenu() {
    setMenus((current) => [...current, { ...emptyMenu }]);
  }

  function removeMenu(index) {
    setMenus((current) =>
      current.length === 1 ? [{ ...emptyMenu }] : current.filter((_, menuIndex) => menuIndex !== index)
    );
  }

  function resetForm() {
    setRestaurant(emptyRestaurant);
    setMenus([{ ...emptyMenu }]);
    setMessage("");
    setMessageType("success");
    setFormVersion((current) => current + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!restaurant.name.trim()) {
      setMessageType("error");
      setMessage("식당 제목을 입력해 주세요.");
      return;
    }

    if (!restaurant.address.trim()) {
      setMessageType("error");
      setMessage("식당 주소를 입력해 주세요.");
      return;
    }

    if (restaurant.categories.length === 0) {
      setMessageType("error");
      setMessage("카테고리를 하나 이상 선택해 주세요.");
      return;
    }

    const invalidMenu = menus.find(
      (menu) =>
        !menu.name.trim() &&
        (menu.price.trim() || menu.description.trim() || menu.image || menu.video)
    );

    if (invalidMenu) {
      setMessageType("error");
      setMessage("가격, 설명, 미디어가 있는 메뉴는 메뉴명을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessageType("success");
    setMessage("파일 업로드와 식당 등록을 진행 중입니다.");

    try {
      const payload = await buildRestaurantPayload(restaurant, menus);
      const response = await createRestaurant(payload);
      const restaurantId = response?.restaurantId || response?.id;

      setMessageType("success");
      setMessage(
        restaurantId
          ? `식당 정보가 등록되었습니다. 등록 ID: ${restaurantId}`
          : "식당 정보가 등록되었습니다."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "식당 정보 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="식당 정보 등록"
      description="식당 기본 정보, 소개 문구, 대표 메뉴를 등록할 수 있는 화면입니다."
    >
      <form key={formVersion} className="stack-layout restaurant-registration" onSubmit={handleSubmit}>
        {message ? (
          <div className={messageType === "success" ? "api-status api-status--success" : "api-status api-status--error"}>
            {message}
          </div>
        ) : null}

        <section className="support-panel">
          <div className="support-panel__header">
            <span className="support-kicker">기본 정보</span>
            <h3>식당을 식별할 수 있는 정보를 입력합니다.</h3>
          </div>

          <div className="admin-form">
            <label className="admin-field">
              <span>식당 제목</span>
              <input
                type="text"
                value={restaurant.name}
                onChange={(event) => updateRestaurantField("name", event.target.value)}
                placeholder="예: 플레이팅 키친 강남점"
              />
            </label>

            <label className="admin-field">
              <span>주소</span>
              <input
                type="text"
                value={restaurant.address}
                onChange={(event) => updateRestaurantField("address", event.target.value)}
                placeholder="예: 서울 강남구 테헤란로 123"
              />
            </label>

            <div className="admin-field">
              <span>카테고리</span>
              <div className="restaurant-category-grid">
                {categoryOptions.map((category) => (
                  <label key={category} className="restaurant-category-option">
                    <input
                      type="checkbox"
                      checked={restaurant.categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
              <small className="restaurant-field-hint">
                최대 {maxCategoryCount}개 선택 가능
              </small>
            </div>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>연락처</span>
                <input
                  type="tel"
                  value={restaurant.phone}
                  onChange={(event) => updateRestaurantField("phone", event.target.value)}
                  placeholder="예: 02-1234-5678"
                />
              </label>

              <label className="admin-field">
                <span>영업시간</span>
                <input
                  type="text"
                  value={restaurant.businessHours}
                  onChange={(event) => updateRestaurantField("businessHours", event.target.value)}
                  placeholder="예: 매일 11:00 - 22:00"
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
                placeholder="식당 분위기, 대표 음식, 이용자가 알면 좋은 정보를 입력해 주세요."
              />
            </label>

            <div className="restaurant-media-grid">
              <label className="admin-field">
                <span>식당 대표 이미지</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => updateRestaurantFile("representativeImage", event.target.files?.[0])}
                />
                <small className="restaurant-field-hint">
                  {restaurant.representativeImage?.name || "이미지 파일을 선택해 주세요."}
                </small>
              </label>

              <label className="admin-field">
                <span>식당 대표 동영상</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(event) => updateRestaurantFile("representativeVideo", event.target.files?.[0])}
                />
                <small className="restaurant-field-hint">
                  {restaurant.representativeVideo?.name || "동영상 파일을 선택해 주세요."}
                </small>
              </label>
            </div>
          </div>
        </section>

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">메뉴</span>
              <h3>대표 메뉴를 등록합니다.</h3>
            </div>
            <button type="button" className="restaurant-menu-add" onClick={addMenu} disabled={isSubmitting}>
              메뉴 추가
            </button>
          </div>

          <div className="restaurant-menu-list">
            {menus.map((menu, index) => (
              <article key={index} className="restaurant-menu-item">
                <div className="restaurant-menu-item__topline">
                  <strong>메뉴 {index + 1}</strong>
                  <button type="button" onClick={() => removeMenu(index)} disabled={isSubmitting}>
                    삭제
                  </button>
                </div>

                <div className="admin-inline-fields">
                  <label className="admin-field">
                    <span>메뉴명</span>
                    <input
                      type="text"
                      value={menu.name}
                      onChange={(event) => updateMenuField(index, "name", event.target.value)}
                      placeholder="예: 시그니처 파스타"
                    />
                  </label>

                  <label className="admin-field">
                    <span>가격</span>
                    <input
                      type="text"
                      value={menu.price}
                      onChange={(event) => updateMenuField(index, "price", event.target.value)}
                      placeholder="예: 18,000원"
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>메뉴 설명</span>
                  <textarea
                    rows={3}
                    value={menu.description}
                    onChange={(event) => updateMenuField(index, "description", event.target.value)}
                    placeholder="메뉴 특징이나 알레르기 안내 등 필요한 내용을 입력해 주세요."
                  />
                </label>

                <div className="restaurant-media-grid">
                  <label className="admin-field">
                    <span>메뉴 이미지</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateMenuFile(index, "image", event.target.files?.[0])}
                    />
                    <small className="restaurant-field-hint">
                      {menu.image?.name || "메뉴 이미지를 선택해 주세요."}
                    </small>
                  </label>

                  <label className="admin-field">
                    <span>메뉴 동영상</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(event) => updateMenuFile(index, "video", event.target.files?.[0])}
                    />
                    <small className="restaurant-field-hint">
                      {menu.video?.name || "메뉴 동영상을 선택해 주세요."}
                    </small>
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="support-panel support-panel--split">
          <div>
            <div className="support-panel__header">
              <span className="support-kicker">입력 요약</span>
              <h3>{restaurant.name.trim() || "식당 제목 미입력"}</h3>
            </div>
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
                <dt>대표 이미지</dt>
                <dd>{restaurant.representativeImage?.name || "-"}</dd>
              </div>
              <div>
                <dt>대표 동영상</dt>
                <dd>{restaurant.representativeVideo?.name || "-"}</dd>
              </div>
              <div>
                <dt>대표 메뉴</dt>
                <dd>{completedMenuCount}개</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{toExposureStatusLabel(restaurant.exposureStatus)}</dd>
              </div>
            </dl>
          </div>

          <div className="admin-actions restaurant-submit-actions">
            <button type="button" onClick={resetForm} disabled={isSubmitting}>
              초기화
            </button>
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? "등록 중" : "등록"}
            </button>
          </div>
        </section>
      </form>
    </PageLayout>
  );
}

async function buildRestaurantPayload(restaurant, menus) {
  const representativeMedia = await uploadMediaList([
    {
      file: restaurant.representativeImage,
      mediaType: "image",
      usageType: "representative",
      displayOrder: 0,
    },
    {
      file: restaurant.representativeVideo,
      mediaType: "video",
      usageType: "representative",
      displayOrder: 1,
    },
  ]);

  const normalizedMenus = await Promise.all(
    menus
      .filter((menu) => menu.name.trim() || menu.price.trim() || menu.description.trim() || menu.image || menu.video)
      .map(async (menu, index) => ({
        name: menu.name.trim(),
        price: parsePrice(menu.price),
        description: menu.description.trim(),
        displayOrder: index,
        media: await uploadMediaList([
          {
            file: menu.image,
            mediaType: "image",
            usageType: "menu",
            displayOrder: 0,
          },
          {
            file: menu.video,
            mediaType: "video",
            usageType: "menu",
            displayOrder: 1,
          },
        ]),
      }))
  );

  return {
    title: restaurant.name.trim(),
    address: restaurant.address.trim(),
    phone: restaurant.phone.trim(),
    businessHours: restaurant.businessHours.trim(),
    introduction: restaurant.introduction.trim(),
    exposureStatus: restaurant.exposureStatus,
    categories: restaurant.categories,
    media: representativeMedia,
    menus: normalizedMenus,
  };
}

async function uploadMediaList(mediaItems) {
  const uploadResults = await Promise.all(
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

  return uploadResults;
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
    default:
      return "임시 저장";
  }
}

export default RestaurantRegistration;
