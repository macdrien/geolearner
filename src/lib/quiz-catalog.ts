export type QuizLocation = {
  name: string;
  population: number;
};

export type QuizDepartment = {
  code: string;
  name: string;
  regionCode: string;
  prefecture: string;
};

export type QuizArea = {
  code: string;
  name: string;
  communes: QuizLocation[];
};

export type EnglandCounty = {
  name: string;
  seat: string;
};

export type RankedCountry = QuizLocation & {
  area: number;
};

export type GeographyData = {
  departments: QuizDepartment[];
  frenchCities: QuizLocation[];
  frenchRegions: QuizArea[];
  occitanieDepartments: QuizArea[];
  englandCounties: EnglandCounty[];
  englandCities: QuizLocation[];
  worldPopulation: RankedCountry[];
  worldArea: RankedCountry[];
};

export const quizCategories = [
  {
    id: "departments",
    title: "Les départements français",
    detail: "Retrouve le département à partir de sa préfecture",
  },
  {
    id: "prefectures",
    title: "Les préfectures françaises",
    detail: "Retrouve la préfecture de chaque département",
  },
  {
    id: "regions",
    title: "Les régions françaises",
    detail: "Retrouve les régions à partir des départements qui les composent",
  },
  {
    id: "french-cities",
    title: "Les plus grandes communes de France",
    detail: "Classement des communes, outre-mer inclus",
  },
  {
    id: "england-counties",
    title: "Les counties anglais",
    detail: "Associe chaque county à son chef-lieu traditionnel",
  },
  {
    id: "england-seats",
    title: "Les chefs-lieux des counties anglais",
    detail: "Retrouve le county à partir de son chef-lieu",
  },
  {
    id: "england-cities",
    title: "Les plus grandes villes d’Angleterre",
    detail: "Classement des villes par population",
  },
  {
    id: "world-population",
    title: "Les pays les plus peuplés",
    detail: "Classement des pays par population",
  },
  {
    id: "world-area",
    title: "Les plus grands pays du monde",
    detail: "Classement des pays par superficie",
  },
  {
    id: "region-cities",
    title: "Les plus grandes communes par région",
    detail: "Choisis une région française",
  },
  {
    id: "occitanie-cities",
    title: "Les communes d’Occitanie par département",
    detail: "Choisis un département d’Occitanie",
  },
] as const;

export type QuizCategoryId = (typeof quizCategories)[number]["id"];

export const quizCategoryGroups = [
  {
    id: "france",
    title: "France",
    categoryIds: [
      "departments",
      "prefectures",
      "regions",
      "french-cities",
      "region-cities",
      "occitanie-cities",
    ],
  },
  {
    id: "england",
    title: "Angleterre",
    categoryIds: ["england-counties", "england-seats", "england-cities"],
  },
  {
    id: "world",
    title: "Monde",
    categoryIds: ["world-population", "world-area"],
  },
] as const;

export type QuizFormatId = "classic" | "list" | "map";
