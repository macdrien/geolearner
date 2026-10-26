"use client";

import {
  getAvailableQuizSizes,
  getAvailableQuizFormats,
  getQuizQuestionCount,
  getSelectedQuizSize,
  isRankedQuizCategory,
  quizCategories,
  quizCategoryGroups,
  type GeographyData,
  type QuizCategoryId,
  type QuizFormatId,
  type QuizRequest,
  type QuizSize,
} from "@/lib/quiz-engine";
import SelectableOptionGroup, {
  type SelectableOption,
} from "./selectable-option-group";
import {
  quizFormats,
  quizIcons,
  quizModes,
  type QuizModeId,
} from "./quiz-options";
import styles from "../page.module.css";

type QuizConfigurationProps = {
  geography: GeographyData;
  category: QuizCategoryId;
  format: QuizFormatId;
  mapIdentification: "name" | "code";
  mode: QuizModeId;
  quizSize: QuizSize;
  regionCode: string;
  departmentCode: string;
  error: string | null;
  onCategoryChange: (category: QuizCategoryId) => void;
  onFormatChange: (format: QuizFormatId) => void;
  onMapIdentificationChange: (identification: "name" | "code") => void;
  onModeChange: (mode: QuizModeId) => void;
  onQuizSizeChange: (size: QuizSize) => void;
  onRegionChange: (code: string) => void;
  onDepartmentChange: (code: string) => void;
  onStart: (request: QuizRequest) => void;
};

function getAreaCode(
  category: QuizCategoryId,
  regionCode: string,
  departmentCode: string,
) {
  if (category === "region-cities") return regionCode;
  if (category === "occitanie-cities") return departmentCode;
  return undefined;
}

function SectionHeading({
  id,
  step,
  eyebrow,
  title,
}: {
  id?: string;
  step: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div className={styles.stepNumber}>{step}</div>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
    </div>
  );
}

export default function QuizConfiguration({
  geography,
  category,
  format,
  mapIdentification,
  mode,
  quizSize,
  regionCode,
  departmentCode,
  error,
  onCategoryChange,
  onFormatChange,
  onMapIdentificationChange,
  onModeChange,
  onQuizSizeChange,
  onRegionChange,
  onDepartmentChange,
  onStart,
}: QuizConfigurationProps) {
  const areaCode = getAreaCode(category, regionCode, departmentCode);
  const availableSizes = getAvailableQuizSizes(geography, category, areaCode);
  const selectedSize = getSelectedQuizSize(
    geography,
    category,
    quizSize,
    areaCode,
  );
  const questionCount = isRankedQuizCategory(category)
    ? selectedSize
    : getQuizQuestionCount(geography, category);

  const categoryOptions = (categoryIds: readonly QuizCategoryId[]) =>
    quizCategories
      .filter((option) => categoryIds.some((categoryId) => categoryId === option.id))
      .map(
        (option): SelectableOption<QuizCategoryId> => ({
          id: option.id,
          title: option.title,
          detail: option.detail,
          icon: quizIcons[option.id],
          meta: isRankedQuizCategory(option.id)
            ? "10/50/100"
            : getQuizQuestionCount(geography, option.id),
        }),
      );

  const modeOptions: SelectableOption<QuizModeId>[] = quizModes.map(
    (option) => ({
      id: option.id,
      title: option.title,
      detail: option.detail,
    }),
  );
  const formatOptions: SelectableOption<QuizFormatId>[] =
    getAvailableQuizFormats(category)
      .filter((formatId) => mode !== "race" || formatId !== "list")
      .map((formatId) => {
      const option = quizFormats.find(({ id }) => id === formatId);
      if (!option) throw new Error(`Format de quiz inconnu : ${formatId}.`);
      return {
        id: option.id,
        title: option.title,
        detail: option.detail,
      };
      });
  const hasQuizSettings =
    isRankedQuizCategory(category) ||
    category === "region-cities" ||
    category === "occitanie-cities" ||
    (category === "departments" && format === "map");

  function handleStart() {
    onStart({
      category,
      format,
      size: selectedSize,
      areaCode,
      mapIdentification,
    });
  }

  return (
    <section
      className={styles.selectorCard}
      aria-labelledby="questionnaire-title"
    >
      <SectionHeading
        id="questionnaire-title"
        step="01"
        eyebrow="Choisis ton sujet"
        title="Qu’est-ce que tu veux réviser ?"
      />
      <div aria-labelledby="questionnaire-title">
        {quizCategoryGroups.map((group) => (
          <section className={styles.quizCategoryGroup} key={group.id}>
            <h3>{group.title}</h3>
            <SelectableOptionGroup
              onSelect={onCategoryChange}
              options={categoryOptions(group.categoryIds)}
              selectedValue={category}
              variant="quiz"
            />
          </section>
        ))}
      </div>
      <div className={styles.modeSection}>
        <SectionHeading
          step="02"
          eyebrow="Choisis le type de quiz"
          title="Comment veux-tu répondre ?"
        />
        <SelectableOptionGroup
          onSelect={onFormatChange}
          options={formatOptions}
          selectedValue={format}
          variant="mode"
        />
      </div>
      {hasQuizSettings && (
        <section
          className={styles.quizSettingsPanel}
          aria-label="Options du quiz"
        >
          <h3>Options du quiz</h3>
          {isRankedQuizCategory(category) && (
            <div className={styles.quizSettings}>
              <label htmlFor="quiz-size">Nombre de questions</label>
              <select
                id="quiz-size"
                value={selectedSize}
                onChange={(event) => {
                  const size = Number(event.target.value);
                  if (availableSizes.includes(size)) onQuizSizeChange(size);
                }}
              >
                {availableSizes.map((size) => (
                  <option key={size} value={size}>
                    {size > 10 && ![50, 100].includes(size)
                      ? `Toutes les communes (${size})`
                      : `${size} questions`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {category === "region-cities" && (
            <div className={styles.quizSettings}>
              <label htmlFor="quiz-region">Région</label>
              <select
                id="quiz-region"
                value={regionCode}
                onChange={(event) => onRegionChange(event.target.value)}
              >
                {geography.frenchRegions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {category === "occitanie-cities" && (
            <div className={styles.quizSettings}>
              <label htmlFor="quiz-department">Département d’Occitanie</label>
              <select
                id="quiz-department"
                value={departmentCode}
                onChange={(event) => onDepartmentChange(event.target.value)}
              >
                {geography.occitanieDepartments.map((department) => (
                  <option key={department.code} value={department.code}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {category === "departments" && format === "map" && (
            <div className={styles.quizSettings}>
              <label htmlFor="map-identification">
                Identifier les départements par
              </label>
              <select
                id="map-identification"
                value={mapIdentification}
                onChange={(event) => {
                  const identification = event.target.value;
                  if (identification === "name" || identification === "code") {
                    onMapIdentificationChange(identification);
                  }
                }}
              >
                <option value="name">Nom</option>
                <option value="code">Numéro</option>
              </select>
            </div>
          )}
        </section>
      )}
      <div className={styles.modeSection}>
        <SectionHeading
          step="03"
          eyebrow="Choisis ton rythme"
          title="Comment veux-tu jouer ?"
        />
        <SelectableOptionGroup
          onSelect={onModeChange}
          options={modeOptions}
          selectedValue={mode}
          variant="mode"
        />
      </div>
      <div className={styles.startQuizArea}>
        <p>
          {questionCount} questions ·{" "}
          {quizModes.find((option) => option.id === mode)?.title}
        </p>
        {error && (
          <p className={styles.quizError} role="alert">
            {error}
          </p>
        )}
        <button
          className={styles.startQuizButton}
          type="button"
          onClick={handleStart}
        >
          Démarrer le quiz
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
