import type {
  EnglandCounty,
  GeographyData,
  QuizCategoryId,
  QuizFormatId,
  QuizLocation,
} from "./quiz-catalog";
import { quizCategories } from "./quiz-catalog";

export { quizCategories, quizCategoryGroups } from "./quiz-catalog";
export type {
  EnglandCounty,
  GeographyData,
  QuizArea,
  QuizCategoryId,
  QuizFormatId,
  QuizDepartment,
  QuizLocation,
  RankedCountry,
} from "./quiz-catalog";

export type QuizSize = number;

export type QuizRequest = {
  category: QuizCategoryId;
  format?: QuizFormatId;
  size?: QuizSize;
  areaCode?: string;
  mapIdentification?: "name" | "code";
};

export type QuizQuestion = {
  prompt: string;
  answer: string;
  acceptedAnswers?: string[];
  choices: string[];
};

type QuestionPrompt = Pick<
  QuizQuestion,
  "prompt" | "answer" | "acceptedAnswers"
>;
type RankedQuizContext = {
  locations: QuizLocation[];
  subject: string;
};
type RankedQuizSource = {
  resolve: (data: GeographyData, areaCode?: string) => RankedQuizContext;
};

const rankedQuizSources: Partial<
  Record<QuizCategoryId, RankedQuizSource>
> = {
  "french-cities": {
    resolve: (data) => ({
      locations: data.frenchCities,
      subject: "des communes françaises",
    }),
  },
  "england-cities": {
    resolve: (data) => ({
      locations: data.englandCities,
      subject: "des villes anglaises",
    }),
  },
  "world-population": {
    resolve: (data) => ({
      locations: data.worldPopulation,
      subject: "des pays par population",
    }),
  },
  "world-area": {
    resolve: (data) => ({
      locations: data.worldArea,
      subject: "des pays par superficie",
    }),
  },
  "region-cities": {
    resolve: (data, areaCode) => {
      const region = data.frenchRegions.find(({ code }) => code === areaCode);
      if (!region) throw new Error("Sélectionne une région française valide.");

      return {
        locations: region.communes,
        subject: `des communes de ${region.name}`,
      };
    },
  },
  "occitanie-cities": {
    resolve: (data, areaCode) => {
      const department = data.occitanieDepartments.find(
        ({ code }) => code === areaCode,
      );
      if (!department) {
        throw new Error("Sélectionne un département d’Occitanie valide.");
      }

      return {
        locations: department.communes,
        subject: `des communes du département ${department.name}`,
      };
    },
  },
};

const fixedQuizCounts: Partial<
  Record<QuizCategoryId, (data: GeographyData) => number>
> = {
  departments: (data) => data.departments.length,
  prefectures: (data) => data.departments.length,
  regions: (data) => data.frenchRegions.length,
  "england-counties": (data) => data.englandCounties.length,
  "england-seats": (data) =>
    new Set(data.englandCounties.map(({ seat }) => seat)).size,
};

function shuffle<T>(items: T[], random: () => number) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.min(
      index,
      Math.max(0, Math.floor(random() * (index + 1))),
    );
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createQuestions(
  items: QuestionPrompt[],
  answerPool: string[],
  random: () => number,
) {
  if (answerPool.length < 4) {
    throw new Error("Un quiz doit proposer au moins quatre réponses possibles.");
  }

  return shuffle(items, random).map(({ prompt, answer, acceptedAnswers }) => {
    const distractors = shuffle(
      [...new Set(answerPool.filter((option) => option !== answer))],
      random,
    ).slice(0, 3);

    if (distractors.length < 3) {
      throw new Error("Impossible de générer trois réponses incorrectes.");
    }

    return {
      prompt,
      answer,
      ...(acceptedAnswers ? { acceptedAnswers } : {}),
      choices: shuffle([answer, ...distractors], random),
    };
  });
}

function validateQuizSize(size: QuizSize) {
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new Error("Le nombre de questions doit être compris entre 1 et 100.");
  }
}

function rankedQuestions(
  locations: QuizLocation[],
  size: QuizSize,
  subject: string,
  format: QuizFormatId,
) {
  validateQuizSize(size);
  if (locations.length < size) {
    throw new Error(`Le classement ne contient pas ${size} éléments.`);
  }

  return locations.slice(0, size).map((location, index) => ({
    prompt:
      format === "map"
        ? `Trouve ${location.name} sur la carte.`
        : `Quel nom occupe la ${index === 0 ? "1re" : `${index + 1}e`} place du classement ${subject} ?`,
    answer: location.name,
  }));
}

function createCountySeatQuestions(counties: EnglandCounty[]) {
  const countiesBySeat = new Map<string, string[]>();
  for (const { name, seat } of counties) {
    const names = countiesBySeat.get(seat) ?? [];
    names.push(name);
    countiesBySeat.set(seat, names);
  }

  return [...countiesBySeat].map(([seat, names]) => ({
    prompt:
      names.length > 1
        ? `${seat} est le chef-lieu traditionnel de quels counties ?`
        : `${seat} est le chef-lieu traditionnel de quel county ?`,
    answer: names.join(" et "),
    acceptedAnswers: names,
  }));
}

export function isRankedQuizCategory(
  category: QuizCategoryId,
): boolean {
  return rankedQuizSources[category] !== undefined;
}

export function getAvailableQuizFormats(
  category: QuizCategoryId,
): QuizFormatId[] {
  if (!quizCategories.some(({ id }) => id === category)) {
    throw new Error(`Catégorie de quiz inconnue : ${category}.`);
  }
  return ["classic", "list", "map"];
}

export function normalizeQuizAnswer(answer: string) {
  return answer
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

export function isQuizAnswerCorrect(question: QuizQuestion, answer: string) {
  const normalizedAnswer = normalizeQuizAnswer(answer);
  return [question.answer, ...(question.acceptedAnswers ?? [])].some(
    (acceptedAnswer) => normalizeQuizAnswer(acceptedAnswer) === normalizedAnswer,
  );
}

export function getQuizQuestionCount(
  data: GeographyData,
  category: QuizCategoryId,
  areaCode?: string,
) {
  const rankedSource = rankedQuizSources[category];
  if (rankedSource) {
    return rankedSource.resolve(data, areaCode).locations.length;
  }

  const getCount = fixedQuizCounts[category];
  if (!getCount) throw new Error(`Catégorie de quiz inconnue : ${category}.`);

  return getCount(data);
}

export function getAvailableQuizSizes(
  data: GeographyData,
  category: QuizCategoryId,
  areaCode?: string,
) {
  if (!isRankedQuizCategory(category)) return [];
  const availableCount = getQuizQuestionCount(data, category, areaCode);

  const sizes = [10, 50, 100].filter((size) => size <= availableCount);
  if (availableCount > 0 && availableCount < 100 && !sizes.includes(availableCount)) {
    sizes.push(availableCount);
  }
  return sizes;
}

export function getSelectedQuizSize(
  data: GeographyData,
  category: QuizCategoryId,
  requestedSize: QuizSize,
  areaCode?: string,
) {
  const availableSizes = getAvailableQuizSizes(data, category, areaCode);
  return availableSizes.includes(requestedSize)
    ? requestedSize
    : (availableSizes.at(-1) ?? 10);
}

export function buildQuiz(
  data: GeographyData,
  request: QuizRequest,
  random: () => number = Math.random,
): QuizQuestion[] {
  const format = request.format ?? "classic";
  if (!getAvailableQuizFormats(request.category).includes(format)) {
    throw new Error("Ce format de quiz n’est pas disponible pour ce thème.");
  }

  const size = request.size ?? 10;
  validateQuizSize(size);

  const rankedSource = rankedQuizSources[request.category];
  if (rankedSource) {
    const { locations, subject } = rankedSource.resolve(
      data,
      request.areaCode,
    );
    const items = rankedQuestions(locations, size, subject, format);
    const answerPool = locations.slice(0, size).map(({ name }) => name);
    return createQuestions(items, answerPool, random);
  }

  let items: QuestionPrompt[];
  let answerPool: string[];

  switch (request.category) {
    case "departments":
      items = data.departments.map(({ code, name, prefecture }) => ({
        prompt:
          format === "map"
            ? request.mapIdentification === "code"
              ? `Place le département ${code} sur la carte.`
              : `Place le département ${name} sur la carte.`
            : `Dans quel département se trouve la préfecture de ${prefecture} ?`,
        answer: name,
      }));
      answerPool = data.departments.map(({ name }) => name);
      break;
    case "prefectures":
      items = data.departments.map(({ name, prefecture }) => ({
        prompt:
          format === "map"
            ? `Place le département dont la préfecture est ${prefecture} sur la carte.`
            : `Quelle est la préfecture du département ${name} ?`,
        answer: format === "map" ? name : prefecture,
      }));
      answerPool =
        format === "map"
          ? data.departments.map(({ name }) => name)
          : data.departments.map(({ prefecture }) => prefecture);
      break;
    case "regions":
      items = data.frenchRegions.map((region) => {
        const departments = data.departments
          .filter(({ regionCode }) => regionCode === region.code)
          .map(({ name }) => name);
        return {
          prompt:
            format === "map"
              ? `Place la région ${region.name} sur la carte.`
              : departments.length
                ? `Quelle région regroupe notamment les départements ${departments.join(", ")} ?`
                : `Quelle région française porte le code ${region.code} ?`,
          answer: region.name,
        };
      });
      answerPool = data.frenchRegions.map(({ name }) => name);
      break;
    case "england-counties":
      items = data.englandCounties.map(({ name, seat }) => ({
        prompt:
          format === "map"
            ? `Repère ${seat}, le chef-lieu traditionnel du county ${name}, sur la carte.`
            : `Quel est le chef-lieu traditionnel du county de ${name} ?`,
        answer: seat,
      }));
      answerPool = data.englandCounties.map(({ seat }) => seat);
      break;
    case "england-seats":
      items =
        format === "map"
          ? createCountySeatQuestions(data.englandCounties).map(
              ({ prompt, acceptedAnswers }) => ({
                prompt,
                answer: acceptedAnswers[0],
                acceptedAnswers,
              }),
            )
          : createCountySeatQuestions(data.englandCounties).map(
              ({ prompt, answer }) => ({ prompt, answer }),
            );
      answerPool =
        format === "map"
          ? data.englandCounties.map(({ name }) => name)
          : items.map(({ answer }) => answer);
      break;
    default:
      throw new Error(`Impossible de générer le quiz « ${request.category} ».`);
  }

  return createQuestions(items, answerPool, random);
}
