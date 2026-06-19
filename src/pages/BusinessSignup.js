import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createBusinessApplication,
  fetchBusinessApplicationDetail,
  signupAndCreateBusinessApplication,
  submitBusinessApplication,
  validateBusinessSignupAccountField,
  verifyBusinessRegistration,
} from "../api/businessApplicationApi";
import { loginWithPassword } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import PageLayout from "../components/PageLayout";

const DRAFT_STORAGE_KEY = "plate-service.business-signup-draft";
const accountAvailabilityFields = new Set(["username", "email", "nickname"]);

const categoryOptions = [
  { code: "KOREAN", label: "한식" },
  { code: "CHINESE", label: "중식" },
  { code: "JAPANESE", label: "일식" },
  { code: "WESTERN", label: "양식" },
  { code: "SNACK", label: "분식" },
  { code: "CAFE", label: "카페" },
  { code: "DESSERT", label: "디저트" },
  { code: "PUB", label: "주점" },
  { code: "ETC", label: "기타" },
];

const fullStepOrder = ["account", "owner", "business", "store", "menus", "review"];
const signedInStepOrder = ["owner", "business", "store", "menus", "review"];

const stepLabels = {
  account: "계정",
  owner: "담당자",
  business: "사업자",
  store: "매장",
  menus: "메뉴",
  review: "검토",
};

const initialForm = {
  account: {
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
  },
  ownerProfile: {
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
  },
  business: {
    businessNumber: "",
    businessName: "",
    representativeName: "",
    openingDate: "",
  },
  store: {
    storeName: "",
    regionCode: "SEOUL",
    address: "",
    phone: "",
    email: "",
    description: "",
  },
  categories: ["KOREAN"],
  menus: [
    {
      name: "",
      price: "",
      description: "",
    },
  ],
};

function BusinessSignup() {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();
  const stepOrder = isAuthenticated ? signedInStepOrder : fullStepOrder;
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => readDraft());
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessVerification, setBusinessVerification] = useState(() => createBusinessVerificationState());
  const [isVerifyingBusiness, setIsVerifyingBusiness] = useState(false);
  const [accountAvailability, setAccountAvailability] = useState(() => createAccountAvailabilityState());
  const accountValidationRequests = useRef(createAccountValidationRequestState());
  const latestAccountValues = useRef({ ...form.account });
  const currentStep = stepOrder[Math.min(stepIndex, stepOrder.length - 1)];
  const isLastStep = stepIndex === stepOrder.length - 1;

  const selectedCategoryLabels = useMemo(
    () =>
      form.categories
        .map((code) => categoryOptions.find((option) => option.code === code)?.label || code)
        .join(", "),
    [form.categories]
  );

  useEffect(() => {
    persistDraft(form);
  }, [form]);

  useEffect(() => {
    if (isAuthenticated && stepOrder[stepIndex] === "account") {
      setStepIndex(0);
    }
  }, [isAuthenticated, stepIndex, stepOrder]);

  function updateNested(section, field, value) {
    if (section === "account") {
      latestAccountValues.current[field] = value;
    }

    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
    clearError(`${section}.${field}`);

    if (section === "account" && accountAvailabilityFields.has(field)) {
      accountValidationRequests.current[field] = createAccountValidationRequestFieldState();
      resetAccountAvailability(field);
    }

    if (section === "business") {
      clearError("business.verification");
      setBusinessVerification(createBusinessVerificationState());
    }
  }

  function updateMenu(index, field, value) {
    setForm((current) => ({
      ...current,
      menus: current.menus.map((menu, menuIndex) =>
        menuIndex === index
          ? {
              ...menu,
              [field]: value,
            }
          : menu
      ),
    }));
    clearError(`menus.${index}.${field}`);
  }

  function addMenu() {
    setForm((current) => ({
      ...current,
      menus: [
        ...current.menus,
        {
          name: "",
          price: "",
          description: "",
        },
      ],
    }));
  }

  function removeMenu(index) {
    setForm((current) => ({
      ...current,
      menus:
        current.menus.length === 1
          ? [
              {
                name: "",
                price: "",
                description: "",
              },
            ]
          : current.menus.filter((_, menuIndex) => menuIndex !== index),
    }));
  }

  function toggleCategory(code) {
    setForm((current) => {
      const isSelected = current.categories.includes(code);
      const categories = isSelected
        ? current.categories.filter((item) => item !== code)
        : [...current.categories, code];

      return {
        ...current,
        categories: categories.slice(0, 4),
      };
    });
    clearError("categories");
  }

  function clearError(field) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function resetAccountAvailability(field) {
    setAccountAvailability((current) => ({
      ...current,
      [field]: createAccountAvailabilityFieldState(),
    }));
  }

  function setAccountAvailabilityField(field, nextState) {
    setAccountAvailability((current) => ({
      ...current,
      [field]: nextState,
    }));
  }

  async function handleValidateAccountField(field) {
    if (isAuthenticated || !accountAvailabilityFields.has(field)) {
      return;
    }

    const value = normalizeAccountValidationValue(field, latestAccountValues.current[field]);
    const localError = getAccountLocalError(field, value);

    if (localError) {
      setAccountAvailabilityField(field, createAccountAvailabilityFieldState());
      setFieldErrors((current) => ({
        ...current,
        [`account.${field}`]: localError,
      }));
      return;
    }

    const activeRequest = accountValidationRequests.current[field];
    if (activeRequest.value === value && (activeRequest.status === "checking" || activeRequest.status === "available")) {
      return;
    }

    const requestId = activeRequest.requestId + 1;
    accountValidationRequests.current[field] = {
      requestId,
      status: "checking",
      value,
    };

    clearError(`account.${field}`);
    setAccountAvailabilityField(field, {
      status: "checking",
      message: "사용 가능 여부를 확인하고 있습니다.",
      checkedValue: value,
    });

    try {
      const result = await validateBusinessSignupAccountField({ field, value });
      const responseValue = normalizeAccountValidationValue(field, result?.value ?? value);
      const currentValue = normalizeAccountValidationValue(field, latestAccountValues.current[field]);

      if (accountValidationRequests.current[field].requestId !== requestId || responseValue !== currentValue) {
        return;
      }

      const available = Boolean(result?.available);
      const message =
        result?.message || (available ? getAccountAvailableMessage(field) : getAccountUnavailableMessage(field));

      setAccountAvailabilityField(field, {
        status: available ? "available" : "duplicate",
        message,
        checkedValue: responseValue,
      });
      accountValidationRequests.current[field] = {
        requestId,
        status: available ? "available" : "duplicate",
        value: responseValue,
      };

      if (!available) {
        setFieldErrors((current) => ({
          ...current,
          [`account.${field}`]: message,
        }));
      }
    } catch (error) {
      if (accountValidationRequests.current[field].requestId !== requestId) {
        return;
      }

      const message =
        error.status === 429
          ? "요청이 많습니다. 잠시 후 다시 확인해 주세요."
          : error.message || "중복 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      accountValidationRequests.current[field] = {
        requestId,
        status: "error",
        value,
      };
      setAccountAvailabilityField(field, {
        status: "error",
        message,
        checkedValue: value,
      });
      setFieldErrors((current) => ({
        ...current,
        [`account.${field}`]: message,
      }));
    }
  }

  function handleNext() {
    const errors = validateStep(currentStep, form, isAuthenticated, businessVerification, accountAvailability);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("필수 입력값을 확인해 주세요.");
      return;
    }

    setFieldErrors({});
    setMessage("");
    setStepIndex((current) => Math.min(current + 1, stepOrder.length - 1));
  }

  function handlePrevious() {
    setMessage("");
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function handleAccountConflict(error) {
    const conflictErrors = error?.payload?.data?.fieldErrors;
    if (isAuthenticated || error?.status !== 409 || error?.code !== "ACCOUNT_CONFLICT" || !conflictErrors) {
      return false;
    }

    const nextFieldErrors = {};
    const nextAvailability = { ...accountAvailability };

    accountAvailabilityFields.forEach((field) => {
      const fieldMessage = conflictErrors[field];
      if (!fieldMessage) {
        return;
      }

      const value = normalizeAccountValidationValue(field, latestAccountValues.current[field]);
      nextFieldErrors[`account.${field}`] = fieldMessage;
      nextAvailability[field] = {
        status: "duplicate",
        message: fieldMessage,
        checkedValue: value,
      };
      accountValidationRequests.current[field] = {
        requestId: accountValidationRequests.current[field].requestId + 1,
        status: "duplicate",
        value,
      };
    });

    setFieldErrors(nextFieldErrors);
    setAccountAvailability(nextAvailability);
    setStepIndex(fullStepOrder.indexOf("account"));
    setMessage(error.message || "이미 사용 중인 계정 정보가 있습니다.");
    return true;
  }

  async function handleVerifyBusiness() {
    const errors = validateBusinessFields(form.business);

    if (Object.keys(errors).length > 0) {
      setFieldErrors((current) => ({
        ...current,
        ...errors,
      }));
      setBusinessVerification({
        status: "failed",
        message: "사업자 검증에 필요한 정보를 확인해 주세요.",
        verifiedAt: null,
      });
      return;
    }

    setIsVerifyingBusiness(true);
    setBusinessVerification({
      status: "checking",
      message: "사업자 정보를 확인하고 있습니다.",
      verifiedAt: null,
    });
    clearError("business.verification");

    try {
      const result = await verifyBusinessRegistration(buildBusinessVerificationPayload(form.business));
      const verified = Boolean(result?.verified) || result?.verificationStatus === "verified";
      const message =
        result?.message ||
        (verified ? "사업자 정보가 확인되었습니다." : "사업자 정보가 일치하지 않습니다.");

      setBusinessVerification({
        status: verified ? "verified" : "failed",
        message,
        verifiedAt: result?.verifiedAt || null,
      });

      if (!verified) {
        setFieldErrors((current) => ({
          ...current,
          "business.verification": message,
        }));
      }
    } catch (error) {
      const fallbackMessage = error.message || "사업자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setBusinessVerification({
        status: "failed",
        message: fallbackMessage,
        verifiedAt: null,
      });
      setFieldErrors((current) => ({
        ...current,
        "business.verification": fallbackMessage,
      }));
    } finally {
      setIsVerifyingBusiness(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validateAll(form, isAuthenticated, businessVerification, accountAvailability);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("입점 신청에 필요한 정보를 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const applicationPayload = buildApplicationPayload(form, businessVerification);
      let createdApplication;

      if (isAuthenticated) {
        createdApplication = await createBusinessApplication(applicationPayload);
      } else {
        createdApplication = await signupAndCreateBusinessApplication({
          account: buildAccountPayload(form.account),
          ...applicationPayload,
        });

        const tokens = await loginWithPassword({
          username: form.account.username.trim(),
          password: form.account.password,
        });
        login(tokens);
      }

      const applicationId = createdApplication.applicationId;
      const detail = await fetchBusinessApplicationDetail(applicationId);

      await submitBusinessApplication(applicationId, {
        version: detail.version,
      });

      clearDraft();
      navigate(`/business/applications/${applicationId}`, {
        replace: true,
        state: {
          notice: "입점 신청이 접수되었습니다. 운영팀 검토가 끝나면 상태가 변경됩니다.",
        },
      });
    } catch (error) {
      if (handleAccountConflict(error)) {
        return;
      }

      setMessage(error.message || "입점 신청 제출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="식당 입점 신청"
      description="계정 생성부터 사업자 정보 검증, 매장 정보 입력까지 한 번에 진행합니다."
    >
      <form className="stack-layout business-signup" onSubmit={handleSubmit}>
        <StepIndicator stepOrder={stepOrder} currentStep={currentStep} />

        {message ? (
          <div className="api-status api-status--error" role="alert">
            {message}
          </div>
        ) : null}

        {isAuthenticated ? (
          <div className="api-status api-status--success" role="status">
            {user?.displayName || user?.username || "현재 계정"}으로 신청합니다. 계정 정보 단계는 생략됩니다.
          </div>
        ) : null}

        {currentStep === "account" ? (
          <AccountStep
            form={form}
            errors={fieldErrors}
            availability={accountAvailability}
            onBlur={handleValidateAccountField}
            onChange={updateNested}
          />
        ) : null}
        {currentStep === "owner" ? (
          <OwnerStep form={form} errors={fieldErrors} onChange={updateNested} />
        ) : null}
        {currentStep === "business" ? (
          <BusinessStep
            form={form}
            errors={fieldErrors}
            verification={businessVerification}
            isVerifying={isVerifyingBusiness}
            onChange={updateNested}
            onVerify={handleVerifyBusiness}
          />
        ) : null}
        {currentStep === "store" ? (
          <StoreStep form={form} errors={fieldErrors} onChange={updateNested} />
        ) : null}
        {currentStep === "menus" ? (
          <MenusStep
            form={form}
            errors={fieldErrors}
            onAddMenu={addMenu}
            onRemoveMenu={removeMenu}
            onToggleCategory={toggleCategory}
            onUpdateMenu={updateMenu}
          />
        ) : null}
        {currentStep === "review" ? (
          <ReviewStep
            form={form}
            selectedCategoryLabels={selectedCategoryLabels}
          />
        ) : null}

        <div className="admin-actions signup-actions">
          {isAuthenticated ? (
            <Link className="restaurant-text-link restaurant-text-link--secondary" to="/business/applications">
              신청 현황 보기
            </Link>
          ) : null}
          <button type="button" onClick={handlePrevious} disabled={stepIndex === 0 || isSubmitting}>
            이전
          </button>
          {isLastStep ? (
            <button className="button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "제출 중" : "입점 신청 제출"}
            </button>
          ) : (
            <button className="button-primary" type="button" onClick={handleNext}>
              다음
            </button>
          )}
        </div>
      </form>
    </PageLayout>
  );
}

function StepIndicator({ stepOrder, currentStep }) {
  return (
    <ol className="business-stepper" aria-label="입점 신청 단계">
      {stepOrder.map((step, index) => (
        <li
          key={step}
          className={step === currentStep ? "business-stepper__item business-stepper__item--active" : "business-stepper__item"}
        >
          <span>{index + 1}</span>
          <strong>{stepLabels[step]}</strong>
        </li>
      ))}
    </ol>
  );
}

function AccountStep({ form, errors, availability, onBlur, onChange }) {
  return (
    <section className="support-panel">
      <div className="support-panel__header">
        <span className="support-kicker">ACCOUNT</span>
        <h3>계정 정보</h3>
      </div>
      <div className="admin-form">
        <label className="admin-field">
          <span>회원 ID</span>
          <input
            type="text"
            autoComplete="username"
            value={form.account.username}
            onChange={(event) => onChange("account", "username", event.target.value)}
            onBlur={() => onBlur("username")}
            aria-invalid={Boolean(errors["account.username"])}
            placeholder="영문, 숫자 조합"
          />
          <AccountAvailabilityStatus state={availability.username} />
          <FieldError message={errors["account.username"]} />
        </label>
        <label className="admin-field">
          <span>이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={form.account.email}
            onChange={(event) => onChange("account", "email", event.target.value)}
            onBlur={() => onBlur("email")}
            aria-invalid={Boolean(errors["account.email"])}
          />
          <AccountAvailabilityStatus state={availability.email} />
          <FieldError message={errors["account.email"]} />
        </label>
        <div className="admin-inline-fields">
          <label className="admin-field">
            <span>비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.account.password}
              onChange={(event) => onChange("account", "password", event.target.value)}
              aria-invalid={Boolean(errors["account.password"])}
            />
            <FieldError message={errors["account.password"]} />
          </label>
          <label className="admin-field">
            <span>비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.account.passwordConfirm}
              onChange={(event) => onChange("account", "passwordConfirm", event.target.value)}
              aria-invalid={Boolean(errors["account.passwordConfirm"])}
            />
            <FieldError message={errors["account.passwordConfirm"]} />
          </label>
        </div>
        <label className="admin-field">
          <span>닉네임</span>
          <input
            type="text"
            value={form.account.nickname}
            onChange={(event) => onChange("account", "nickname", event.target.value)}
            onBlur={() => onBlur("nickname")}
            aria-invalid={Boolean(errors["account.nickname"])}
          />
          <AccountAvailabilityStatus state={availability.nickname} />
          <FieldError message={errors["account.nickname"]} />
        </label>
      </div>
    </section>
  );
}

function AccountAvailabilityStatus({ state }) {
  if (!state || state.status === "idle") {
    return null;
  }

  const tone = state.status === "available" ? "success" : state.status === "checking" ? "checking" : "error";
  const role = state.status === "available" || state.status === "checking" ? "status" : "alert";

  return (
    <small className={`account-availability account-availability--${tone}`} role={role}>
      {state.message}
    </small>
  );
}

function OwnerStep({ form, errors, onChange }) {
  return (
    <section className="support-panel">
      <div className="support-panel__header">
        <span className="support-kicker">OWNER</span>
        <h3>담당자 정보</h3>
      </div>
      <div className="admin-form">
        <label className="admin-field">
          <span>담당자 이름</span>
          <input
            type="text"
            value={form.ownerProfile.ownerName}
            onChange={(event) => onChange("ownerProfile", "ownerName", event.target.value)}
            aria-invalid={Boolean(errors["ownerProfile.ownerName"])}
          />
          <FieldError message={errors["ownerProfile.ownerName"]} />
        </label>
        <div className="admin-inline-fields">
          <label className="admin-field">
            <span>담당자 연락처</span>
            <input
              type="tel"
              inputMode="numeric"
              value={form.ownerProfile.ownerPhone}
              onChange={(event) => onChange("ownerProfile", "ownerPhone", formatPhoneNumber(event.target.value))}
              placeholder="010-1234-5678"
              aria-invalid={Boolean(errors["ownerProfile.ownerPhone"])}
            />
            <FieldError message={errors["ownerProfile.ownerPhone"]} />
          </label>
          <label className="admin-field">
            <span>담당자 이메일</span>
            <input
              type="email"
              value={form.ownerProfile.ownerEmail}
              onChange={(event) => onChange("ownerProfile", "ownerEmail", event.target.value)}
              aria-invalid={Boolean(errors["ownerProfile.ownerEmail"])}
            />
            <FieldError message={errors["ownerProfile.ownerEmail"]} />
          </label>
        </div>
      </div>
    </section>
  );
}

function BusinessStep({ form, errors, verification, isVerifying, onChange, onVerify }) {
  const isVerified = verification.status === "verified";
  const statusClass =
    verification.status === "failed"
      ? "api-status api-status--error"
      : isVerified
        ? "api-status api-status--success"
        : "api-status";

  return (
    <section className="support-panel">
      <div className="support-panel__header">
        <span className="support-kicker">BUSINESS</span>
        <h3>사업자 정보</h3>
      </div>
      <div className="admin-form">
        <label className="admin-field">
          <span>사업자등록번호</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.business.businessNumber}
            onChange={(event) => onChange("business", "businessNumber", formatBusinessNumber(event.target.value))}
            placeholder="123-45-67890"
            aria-invalid={Boolean(errors["business.businessNumber"])}
          />
          <FieldError message={errors["business.businessNumber"]} />
        </label>
        <div className="admin-inline-fields">
          <label className="admin-field">
            <span>대표자명</span>
            <input
              type="text"
              value={form.business.representativeName}
              onChange={(event) => onChange("business", "representativeName", event.target.value)}
              aria-invalid={Boolean(errors["business.representativeName"])}
            />
            <FieldError message={errors["business.representativeName"]} />
          </label>
          <label className="admin-field">
            <span>개업일자</span>
            <input
              type="date"
              value={form.business.openingDate}
              onChange={(event) => onChange("business", "openingDate", event.target.value)}
              aria-invalid={Boolean(errors["business.openingDate"])}
            />
            <FieldError message={errors["business.openingDate"]} />
          </label>
        </div>
        <label className="admin-field">
          <span>상호명</span>
          <input
            type="text"
            value={form.business.businessName}
            onChange={(event) => onChange("business", "businessName", event.target.value)}
          />
        </label>
        <div className="business-verification-box">
          <button className="button-primary" type="button" onClick={onVerify} disabled={isVerifying}>
            {isVerifying ? "확인 중" : "사업자등록번호 확인"}
          </button>
          <div
            className={statusClass}
            role={isVerified ? "status" : "alert"}
          >
            {verification.message || "사업자등록번호, 대표자명, 개업일자를 입력한 뒤 확인해 주세요."}
          </div>
          <FieldError message={errors["business.verification"]} />
        </div>
      </div>
    </section>
  );
}

function StoreStep({ form, errors, onChange }) {
  return (
    <section className="support-panel">
      <div className="support-panel__header">
        <span className="support-kicker">STORE</span>
        <h3>매장 기본 정보</h3>
      </div>
      <div className="admin-form">
        <label className="admin-field">
          <span>매장명</span>
          <input
            type="text"
            value={form.store.storeName}
            onChange={(event) => onChange("store", "storeName", event.target.value)}
            aria-invalid={Boolean(errors["store.storeName"])}
          />
          <FieldError message={errors["store.storeName"]} />
        </label>
        <div className="admin-inline-fields">
          <label className="admin-field">
            <span>지역 코드</span>
            <select
              value={form.store.regionCode}
              onChange={(event) => onChange("store", "regionCode", event.target.value)}
            >
              <option value="SEOUL">서울</option>
              <option value="GYEONGGI">경기</option>
              <option value="INCHEON">인천</option>
              <option value="BUSAN">부산</option>
              <option value="DAEGU">대구</option>
              <option value="ETC">기타</option>
            </select>
          </label>
          <label className="admin-field">
            <span>매장 연락처</span>
            <input
              type="tel"
              inputMode="numeric"
              value={form.store.phone}
              onChange={(event) => onChange("store", "phone", formatPhoneNumber(event.target.value))}
              placeholder="010-1234-5678"
            />
          </label>
        </div>
        <label className="admin-field">
          <span>주소</span>
          <input
            type="text"
            value={form.store.address}
            onChange={(event) => onChange("store", "address", event.target.value)}
            aria-invalid={Boolean(errors["store.address"])}
          />
          <FieldError message={errors["store.address"]} />
        </label>
        <label className="admin-field">
          <span>매장 이메일</span>
          <input
            type="email"
            value={form.store.email}
            onChange={(event) => onChange("store", "email", event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>매장 소개</span>
          <textarea
            rows={4}
            value={form.store.description}
            onChange={(event) => onChange("store", "description", event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

function MenusStep({ form, errors, onToggleCategory, onUpdateMenu, onAddMenu, onRemoveMenu }) {
  return (
    <section className="support-panel">
      <div className="support-panel__header restaurant-menu-header">
        <div>
          <span className="support-kicker">MENU</span>
          <h3>카테고리와 대표 메뉴</h3>
        </div>
        <button type="button" className="restaurant-menu-add" onClick={onAddMenu}>
          메뉴 추가
        </button>
      </div>

      <fieldset className="restaurant-fieldset" aria-invalid={Boolean(errors.categories)}>
        <legend>카테고리</legend>
        <div className="restaurant-category-grid">
          {categoryOptions.map((category) => (
            <label key={category.code} className="restaurant-category-option">
              <input
                type="checkbox"
                checked={form.categories.includes(category.code)}
                onChange={() => onToggleCategory(category.code)}
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
        <small className="restaurant-field-hint">최대 4개까지 선택할 수 있습니다.</small>
        <FieldError message={errors.categories} />
      </fieldset>

      <div className="restaurant-menu-list business-menu-list">
        {form.menus.map((menu, index) => (
          <article key={index} className="restaurant-menu-item">
            <div className="restaurant-menu-item__topline">
              <strong>대표 메뉴 {index + 1}</strong>
              <button type="button" onClick={() => onRemoveMenu(index)}>
                삭제
              </button>
            </div>
            <div className="restaurant-menu-fields">
              <label className="admin-field">
                <span>메뉴명</span>
                <input
                  type="text"
                  value={menu.name}
                  onChange={(event) => onUpdateMenu(index, "name", event.target.value)}
                  aria-invalid={Boolean(errors[`menus.${index}.name`])}
                />
                <FieldError message={errors[`menus.${index}.name`]} />
              </label>
              <label className="admin-field">
                <span>가격</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={menu.price}
                  onChange={(event) => onUpdateMenu(index, "price", event.target.value)}
                  placeholder="12000"
                />
              </label>
              <label className="admin-field restaurant-menu-description">
                <span>설명</span>
                <textarea
                  rows={2}
                  value={menu.description}
                  onChange={(event) => onUpdateMenu(index, "description", event.target.value)}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewStep({ form, selectedCategoryLabels }) {
  return (
    <section className="support-panel">
      <div className="support-panel__header">
        <span className="support-kicker">REVIEW</span>
        <h3>제출 전 확인</h3>
      </div>
      <dl className="restaurant-summary business-review-summary">
        <SummaryRow label="담당자" value={form.ownerProfile.ownerName} />
        <SummaryRow label="사업자번호" value={maskBusinessNumber(form.business.businessNumber)} />
        <SummaryRow label="대표자명" value={form.business.representativeName} />
        <SummaryRow label="개업일자" value={form.business.openingDate} />
        <SummaryRow label="상호명" value={form.business.businessName || "-"} />
        <SummaryRow label="매장명" value={form.store.storeName} />
        <SummaryRow label="주소" value={form.store.address} />
        <SummaryRow label="카테고리" value={selectedCategoryLabels || "-"} />
        <SummaryRow label="대표 메뉴" value={`${countCompletedMenus(form.menus)}개`} />
      </dl>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function FieldError({ message }) {
  return message ? <small className="restaurant-field-error">{message}</small> : null;
}

function readDraft() {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? mergeForm(initialForm, JSON.parse(raw)) : initialForm;
  } catch (error) {
    return initialForm;
  }
}

function persistDraft(form) {
  try {
    const safeForm = {
      ...form,
      account: {
        ...form.account,
        password: "",
        passwordConfirm: "",
      },
    };
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(safeForm));
  } catch (error) {
    // Draft persistence is a convenience only.
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    // Ignore storage errors.
  }
}

function mergeForm(base, draft) {
  return {
    ...base,
    ...draft,
    account: {
      ...base.account,
      ...draft.account,
    },
    ownerProfile: {
      ...base.ownerProfile,
      ...draft.ownerProfile,
    },
    business: {
      ...base.business,
      ...draft.business,
    },
    store: {
      ...base.store,
      ...draft.store,
    },
    categories: Array.isArray(draft.categories) ? draft.categories : base.categories,
    menus: Array.isArray(draft.menus) && draft.menus.length > 0 ? draft.menus : base.menus,
  };
}

function validateStep(
  step,
  form,
  isAuthenticated,
  businessVerification = createBusinessVerificationState(),
  accountAvailability = createAccountAvailabilityState()
) {
  const errors = {};

  if (step === "account" && !isAuthenticated) {
    validateAccount(form.account, errors);
    validateAccountAvailabilityRequirements(form.account, errors, accountAvailability);
  }

  if (step === "owner") {
    validateOwner(form.ownerProfile, errors);
  }

  if (step === "business") {
    validateBusiness(form.business, errors, businessVerification);
  }

  if (step === "store") {
    validateStore(form.store, errors);
  }

  if (step === "menus") {
    validateCategoriesAndMenus(form, errors);
  }

  return errors;
}

function validateAll(form, isAuthenticated, businessVerification, accountAvailability) {
  return {
    ...validateStep("account", form, isAuthenticated, businessVerification, accountAvailability),
    ...validateStep("owner", form, isAuthenticated, businessVerification, accountAvailability),
    ...validateStep("business", form, isAuthenticated, businessVerification, accountAvailability),
    ...validateStep("store", form, isAuthenticated, businessVerification, accountAvailability),
    ...validateStep("menus", form, isAuthenticated, businessVerification, accountAvailability),
  };
}

function validateAccount(account, errors) {
  ["username", "email", "nickname"].forEach((field) => {
    const localError = getAccountLocalError(field, account[field]);
    if (localError) {
      errors[`account.${field}`] = localError;
    }
  });

  if (String(account.password || "").length < 8) {
    errors["account.password"] = "비밀번호는 8자 이상이어야 합니다.";
  }

  if (account.password !== account.passwordConfirm) {
    errors["account.passwordConfirm"] = "비밀번호가 일치하지 않습니다.";
  }

}

function validateAccountAvailabilityRequirements(account, errors, accountAvailability) {
  requireAccountAvailability(account, errors, accountAvailability, "username", "회원 ID 중복 확인을 완료해 주세요.");
  requireAccountAvailability(account, errors, accountAvailability, "email", "이메일 중복 확인을 완료해 주세요.");
  requireAccountAvailability(account, errors, accountAvailability, "nickname", "닉네임 중복 확인을 완료해 주세요.");
}

function requireAccountAvailability(account, errors, accountAvailability, field, message) {
  const errorKey = `account.${field}`;
  const value = normalizeAccountValidationValue(field, account[field]);
  const availability = accountAvailability?.[field];

  if (errors[errorKey]) {
    return;
  }

  if (availability?.status !== "available" || availability.checkedValue !== value) {
    errors[errorKey] = message;
  }
}

function validateOwner(ownerProfile, errors) {
  if (!String(ownerProfile.ownerName || "").trim()) {
    errors["ownerProfile.ownerName"] = "담당자 이름을 입력해 주세요.";
  }

  if (!String(ownerProfile.ownerPhone || "").trim()) {
    errors["ownerProfile.ownerPhone"] = "담당자 연락처를 입력해 주세요.";
  }

  if (ownerProfile.ownerEmail && !isValidEmail(ownerProfile.ownerEmail)) {
    errors["ownerProfile.ownerEmail"] = "올바른 이메일을 입력해 주세요.";
  }
}

function validateBusinessFields(business) {
  const errors = {};
  const digits = String(business.businessNumber || "").replace(/\D/g, "");

  if (digits.length !== 10) {
    errors["business.businessNumber"] = "사업자등록번호 10자리를 입력해 주세요.";
  }

  if (!String(business.representativeName || "").trim()) {
    errors["business.representativeName"] = "대표자명을 입력해 주세요.";
  }

  if (!isValidDateString(business.openingDate)) {
    errors["business.openingDate"] = "개업일자를 입력해 주세요.";
  }

  return errors;
}

function validateBusiness(business, errors, businessVerification) {
  Object.assign(errors, validateBusinessFields(business));

  if (businessVerification.status !== "verified") {
    errors["business.verification"] = "사업자등록번호 확인을 완료해 주세요.";
  }
}

function validateStore(store, errors) {
  if (!String(store.storeName || "").trim()) {
    errors["store.storeName"] = "매장명을 입력해 주세요.";
  }

  if (!String(store.address || "").trim()) {
    errors["store.address"] = "주소를 입력해 주세요.";
  }

  if (store.email && !isValidEmail(store.email)) {
    errors["store.email"] = "올바른 이메일을 입력해 주세요.";
  }
}

function validateCategoriesAndMenus(form, errors) {
  if (!form.categories.length) {
    errors.categories = "카테고리를 하나 이상 선택해 주세요.";
  }

  form.menus.forEach((menu, index) => {
    const hasAnyMenuValue = menu.name.trim() || menu.price.trim() || menu.description.trim();
    if (hasAnyMenuValue && !menu.name.trim()) {
      errors[`menus.${index}.name`] = "메뉴명을 입력해 주세요.";
    }
  });
}

function buildAccountPayload(account) {
  return {
    username: account.username.trim(),
    email: account.email.trim(),
    password: account.password,
    nickname: account.nickname.trim(),
  };
}

function buildApplicationPayload(form, businessVerification) {
  return {
    ownerProfile: {
      ownerName: form.ownerProfile.ownerName.trim(),
      ownerPhone: form.ownerProfile.ownerPhone.trim(),
      ownerEmail: form.ownerProfile.ownerEmail.trim() || null,
    },
    business: {
      businessNumber: form.business.businessNumber.trim(),
      businessName: form.business.businessName.trim() || null,
      representativeName: form.business.representativeName.trim(),
      openingDate: form.business.openingDate,
      verificationProvider: "NTS",
      verificationStatus: "verified",
      verificationVerifiedAt: businessVerification?.verifiedAt || null,
    },
    store: {
      storeName: form.store.storeName.trim(),
      regionCode: form.store.regionCode,
      address: form.store.address.trim(),
      phone: form.store.phone.trim() || null,
      email: form.store.email.trim() || null,
      description: form.store.description.trim() || null,
    },
    categories: form.categories.map((categoryCode, index) => ({
      categoryCode,
      displayOrder: index,
    })),
    menus: form.menus
      .filter((menu) => menu.name.trim() || menu.price.trim() || menu.description.trim())
      .map((menu, index) => ({
        name: menu.name.trim(),
        price: parsePrice(menu.price),
        description: menu.description.trim() || null,
        displayOrder: index,
      })),
  };
}

function buildBusinessVerificationPayload(business) {
  return {
    businessNumber: business.businessNumber.trim(),
    representativeName: business.representativeName.trim(),
    openingDate: business.openingDate,
    businessName: business.businessName.trim() || null,
  };
}

function createBusinessVerificationState() {
  return {
    status: "idle",
    message: "",
    verifiedAt: null,
  };
}

function createAccountAvailabilityState() {
  return {
    username: createAccountAvailabilityFieldState(),
    email: createAccountAvailabilityFieldState(),
    nickname: createAccountAvailabilityFieldState(),
  };
}

function createAccountAvailabilityFieldState() {
  return {
    status: "idle",
    message: "",
    checkedValue: "",
  };
}

function createAccountValidationRequestState() {
  return {
    username: createAccountValidationRequestFieldState(),
    email: createAccountValidationRequestFieldState(),
    nickname: createAccountValidationRequestFieldState(),
  };
}

function createAccountValidationRequestFieldState() {
  return {
    requestId: 0,
    status: "idle",
    value: "",
  };
}

function parsePrice(value) {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  if (!normalized) {
    return null;
  }

  const price = Number(normalized);
  return Number.isFinite(price) ? price : null;
}

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.startsWith("02")) {
    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }

    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatBusinessNumber(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function countCompletedMenus(menus) {
  return menus.filter((menu) => menu.name.trim()).length;
}

function maskBusinessNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 10) {
    return value || "-";
  }

  return `${digits.slice(0, 3)}-**-*****`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidDateString(value) {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return false;
  }

  const date = new Date(`${normalized}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && normalized === date.toISOString().slice(0, 10);
}

function isValidUsername(value) {
  return /^[A-Za-z0-9]{4,30}$/.test(String(value || "").trim());
}

function getAccountLocalError(field, value) {
  if (field === "username" && !isValidUsername(value)) {
    return "회원 ID는 영문과 숫자 조합 4~30자로 입력해 주세요.";
  }

  if (field === "email" && (!isValidEmail(value) || String(value).length > 320)) {
    return "올바른 이메일을 입력해 주세요.";
  }

  if (field === "nickname" && (!String(value || "").trim() || String(value).trim().length > 100)) {
    return "닉네임은 1~100자로 입력해 주세요.";
  }

  return "";
}

function normalizeAccountValidationValue(field, value) {
  const normalized = String(value || "").trim();
  return field === "email" ? normalized.toLowerCase() : normalized;
}

function getAccountAvailableMessage(field) {
  if (field === "username") {
    return "사용 가능한 회원 ID입니다.";
  }

  if (field === "email") {
    return "사용 가능한 이메일입니다.";
  }

  return "사용 가능한 닉네임입니다.";
}

function getAccountUnavailableMessage(field) {
  if (field === "username") {
    return "이미 사용 중인 회원 ID입니다.";
  }

  if (field === "email") {
    return "이미 가입된 이메일입니다.";
  }

  return "이미 사용 중인 닉네임입니다.";
}

export default BusinessSignup;
