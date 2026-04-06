import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend
} from "recharts";

// ── THEME ──────────────────────────────────────────────────────────────────
const G = {
  gold: "#c9a84c", goldLight: "#e8c97a", goldDim: "#7a6230",
  blue: "#4a9eff", red: "#e06c75", green: "#55c9a0", purple: "#a29bfe",
  bg: "#080808", card: "#111111", card2: "#181818", border: "#222222",
  text: "#e8dfd0", muted: "#6b6358", dimmed: "#3a3530", hover: "#1c1c1c",
};

const GENRE_COLORS = {
  "Fantasy": "#c9a84c", "Sci-Fi": "#4a9eff", "Thriller": "#e06c75",
  "Mystery": "#ff9f7f", "Literary Fiction": "#98d8c8", "Historical Fiction": "#c3a6ff",
  "Non-Fiction": "#ffd166", "Graphic Novel": "#06d6a0", "Memoir": "#74b9ff",
  "Biography": "#81ecec", "Classic": "#fab1a0", "Philosophy": "#a29bfe",
  "Science": "#55c9a0", "Self-Help": "#fdcb6e", "Travel": "#e17055",
  "Horror": "#b2bec3", "History": "#dfe6e9",
};

// ── ALL BOOKS ──────────────────────────────────────────────────────────────
const INITIAL_BOOKS = [
  {id:1,title:"Like the Flowing River",author:"Paulo Coelho",year:2011,genre:"Self-Help",country:"Brazil"},
  {id:2,title:"Eragon",author:"Christopher Paolini",year:2011,genre:"Fantasy",country:"USA"},
  {id:3,title:"Eldest",author:"Christopher Paolini",year:2011,genre:"Fantasy",country:"USA"},
  {id:4,title:"Brisingr",author:"Christopher Paolini",year:2011,genre:"Fantasy",country:"USA"},
  {id:5,title:"The White Tiger",author:"Aravind Adiga",year:2011,genre:"Literary Fiction",country:"India"},
  {id:6,title:"Sea of Poppies",author:"Amitav Ghosh",year:2011,genre:"Historical Fiction",country:"India"},
  {id:7,title:"Harry Potter and the Philosopher's Stone",author:"J.K. Rowling",year:2011,genre:"Fantasy",country:"UK"},
  {id:8,title:"Lolita",author:"Vladimir Nabokov",year:2011,genre:"Classic",country:"Russia"},
  {id:9,title:"World War Z",author:"Max Brooks",year:2011,genre:"Horror",country:"USA"},
  {id:10,title:"House of Leaves",author:"Mark Z. Danielewski",year:2011,genre:"Horror",country:"USA"},
  {id:11,title:"Persepolis",author:"Marjane Satrapi",year:2011,genre:"Graphic Novel",country:"Iran"},
  {id:12,title:"Maus",author:"Art Spiegelman",year:2011,genre:"Graphic Novel",country:"USA"},
  {id:13,title:"Breakfast of Champions",author:"Kurt Vonnegut",year:2011,genre:"Literary Fiction",country:"USA"},
  {id:14,title:"The Colour of Magic",author:"Terry Pratchett",year:2011,genre:"Fantasy",country:"UK"},
  {id:15,title:"The Light Fantastic",author:"Terry Pratchett",year:2011,genre:"Fantasy",country:"UK"},
  {id:16,title:"Journey to the Center of the Earth",author:"Jules Verne",year:2011,genre:"Classic",country:"France"},
  {id:17,title:"Gora",author:"Rabindranath Tagore",year:2011,genre:"Literary Fiction",country:"India"},
  {id:18,title:"Inheritance",author:"Christopher Paolini",year:2011,genre:"Fantasy",country:"USA"},
  {id:19,title:"Elantris",author:"Brandon Sanderson",year:2011,genre:"Fantasy",country:"USA"},
  {id:20,title:"Vagabonding",author:"Rolf Potts",year:2011,genre:"Travel",country:"USA"},
  {id:21,title:"Mistborn",author:"Brandon Sanderson",year:2012,genre:"Fantasy",country:"USA"},
  {id:22,title:"The Well of Ascension",author:"Brandon Sanderson",year:2012,genre:"Fantasy",country:"USA"},
  {id:23,title:"The Hero of Ages",author:"Brandon Sanderson",year:2012,genre:"Fantasy",country:"USA"},
  {id:24,title:"Micro",author:"Michael Crichton",year:2012,genre:"Sci-Fi",country:"USA"},
  {id:25,title:"The Alloy of Law",author:"Brandon Sanderson",year:2012,genre:"Fantasy",country:"USA"},
  {id:26,title:"Warbreaker",author:"Brandon Sanderson",year:2012,genre:"Fantasy",country:"USA"},
  {id:27,title:"The Way of Kings",author:"Brandon Sanderson",year:2012,genre:"Fantasy",country:"USA"},
  {id:28,title:"Love in the Time of Cholera",author:"Gabriel García Márquez",year:2012,genre:"Literary Fiction",country:"Colombia"},
  {id:29,title:"Foundation's Edge",author:"Isaac Asimov",year:2012,genre:"Sci-Fi",country:"USA"},
  {id:30,title:"The Mysterious Flame of Queen Loana",author:"Umberto Eco",year:2012,genre:"Literary Fiction",country:"Italy"},
  {id:31,title:"Batman: Year One",author:"Frank Miller",year:2012,genre:"Graphic Novel",country:"USA"},
  {id:32,title:"Batman: The Killing Joke",author:"Alan Moore",year:2012,genre:"Graphic Novel",country:"UK"},
  {id:33,title:"My Story",author:"Kamala Das",year:2012,genre:"Memoir",country:"India"},
  {id:34,title:"The Redbreast",author:"Jo Nesbø",year:2012,genre:"Thriller",country:"Norway"},
  {id:35,title:"The Story of Philosophy",author:"Will Durant",year:2013,genre:"Philosophy",country:"USA"},
  {id:36,title:"The Immortals of Meluha",author:"Amish Tripathi",year:2013,genre:"Fantasy",country:"India"},
  {id:37,title:"The Secret of the Nagas",author:"Amish Tripathi",year:2013,genre:"Fantasy",country:"India"},
  {id:38,title:"V for Vendetta",author:"Alan Moore",year:2013,genre:"Graphic Novel",country:"UK"},
  {id:39,title:"The Oath of the Vayuputras",author:"Amish Tripathi",year:2013,genre:"Fantasy",country:"India"},
  {id:40,title:"Upanishads",author:"Patrick Olivelle (trans.)",year:2013,genre:"Philosophy",country:"India"},
  {id:41,title:"White Mughals",author:"William Dalrymple",year:2013,genre:"History",country:"UK"},
  {id:42,title:"The Lost Symbol",author:"Dan Brown",year:2013,genre:"Thriller",country:"USA"},
  {id:43,title:"The Eye of the World",author:"Robert Jordan",year:2013,genre:"Fantasy",country:"USA"},
  {id:44,title:"Steve Jobs",author:"Walter Isaacson",year:2013,genre:"Biography",country:"USA"},
  {id:45,title:"The Great Indian Novel",author:"Shashi Tharoor",year:2013,genre:"Literary Fiction",country:"India"},
  {id:46,title:"The Lies of Locke Lamora",author:"Scott Lynch",year:2013,genre:"Fantasy",country:"USA"},
  {id:47,title:"The Great Hunt",author:"Robert Jordan",year:2014,genre:"Fantasy",country:"USA"},
  {id:48,title:"Phantoms in the Brain",author:"V.S. Ramachandran",year:2014,genre:"Science",country:"India"},
  {id:49,title:"Moonward",author:"Appupen",year:2014,genre:"Graphic Novel",country:"India"},
  {id:50,title:"The Itch You Can't Scratch",author:"Sumit Kumar",year:2014,genre:"Graphic Novel",country:"India"},
  {id:51,title:"Manna",author:"Marshall Brain",year:2014,genre:"Sci-Fi",country:"USA"},
  {id:52,title:"You Just Don't Understand",author:"Deborah Tannen",year:2014,genre:"Non-Fiction",country:"USA"},
  {id:53,title:"Masters of Doom",author:"David Kushner",year:2014,genre:"Biography",country:"USA"},
  {id:54,title:"The Day You Discard Your Body",author:"Marshall Brain",year:2014,genre:"Sci-Fi",country:"USA"},
  {id:55,title:"The Dragon Reborn",author:"Robert Jordan",year:2014,genre:"Fantasy",country:"USA"},
  {id:56,title:"Kushiel's Dart",author:"Jacqueline Carey",year:2014,genre:"Fantasy",country:"USA"},
  {id:57,title:"Marker",author:"Robin Cook",year:2015,genre:"Thriller",country:"USA"},
  {id:58,title:"Paranoid",author:"Joseph Finder",year:2015,genre:"Thriller",country:"USA"},
  {id:59,title:"The Kill List",author:"Frederick Forsyth",year:2015,genre:"Thriller",country:"UK"},
  {id:60,title:"The Angel Experiment",author:"James Patterson",year:2015,genre:"Thriller",country:"USA"},
  {id:61,title:"The Player of Games",author:"Iain M. Banks",year:2015,genre:"Sci-Fi",country:"UK"},
  {id:62,title:"The Atlantis Gene",author:"A.G. Riddle",year:2015,genre:"Thriller",country:"USA"},
  {id:63,title:"The Martian",author:"Andy Weir",year:2016,genre:"Sci-Fi",country:"USA"},
  {id:64,title:"Words of Radiance",author:"Brandon Sanderson",year:2016,genre:"Fantasy",country:"USA"},
  {id:65,title:"Shadows of Self",author:"Brandon Sanderson",year:2016,genre:"Fantasy",country:"USA"},
  {id:66,title:"The Emperor's Soul",author:"Brandon Sanderson",year:2016,genre:"Fantasy",country:"USA"},
  {id:67,title:"Harry Potter and the Chamber of Secrets",author:"J.K. Rowling",year:2016,genre:"Fantasy",country:"UK"},
  {id:68,title:"Harry Potter and the Prisoner of Azkaban",author:"J.K. Rowling",year:2016,genre:"Fantasy",country:"UK"},
  {id:69,title:"Harry Potter and the Goblet of Fire",author:"J.K. Rowling",year:2016,genre:"Fantasy",country:"UK"},
  {id:70,title:"Harry Potter and the Order of the Phoenix",author:"J.K. Rowling",year:2016,genre:"Fantasy",country:"UK"},
  {id:71,title:"Harry Potter and the Half-Blood Prince",author:"J.K. Rowling",year:2016,genre:"Fantasy",country:"UK"},
  {id:72,title:"Harry Potter and the Deathly Hallows",author:"J.K. Rowling",year:2016,genre:"Fantasy",country:"UK"},
  {id:73,title:"Inferno",author:"Dan Brown",year:2016,genre:"Thriller",country:"USA"},
  {id:74,title:"A Thousand Splendid Suns",author:"Khaled Hosseini",year:2016,genre:"Literary Fiction",country:"Afghanistan"},
  {id:75,title:"Cradle and All",author:"James Patterson",year:2017,genre:"Thriller",country:"USA"},
  {id:76,title:"Step on a Crack",author:"James Patterson",year:2017,genre:"Thriller",country:"USA"},
  {id:77,title:"The Vital Question",author:"Nick Lane",year:2017,genre:"Science",country:"UK"},
  {id:78,title:"Scion of Ishvaku",author:"Amish Tripathi",year:2017,genre:"Fantasy",country:"India"},
  {id:79,title:"Revelation Space",author:"Alastair Reynolds",year:2017,genre:"Sci-Fi",country:"UK"},
  {id:80,title:"Gone Girl",author:"Gillian Flynn",year:2017,genre:"Thriller",country:"USA"},
  {id:81,title:"Fahrenheit 451",author:"Ray Bradbury",year:2017,genre:"Classic",country:"USA"},
  {id:82,title:"Mahabharata (Amar Chitra Katha)",author:"Amar Chitra Katha",year:2017,genre:"Graphic Novel",country:"India"},
  {id:83,title:"Swami and Friends",author:"R.K. Narayan",year:2017,genre:"Literary Fiction",country:"India"},
  {id:84,title:"Smoke and Mirrors",author:"Neil Gaiman",year:2017,genre:"Fantasy",country:"UK"},
  {id:85,title:"The God of Small Things",author:"Arundhati Roy",year:2017,genre:"Literary Fiction",country:"India"},
  {id:86,title:"Murder on the Orient Express",author:"Agatha Christie",year:2017,genre:"Mystery",country:"UK"},
  {id:87,title:"And Then There Were None",author:"Agatha Christie",year:2017,genre:"Mystery",country:"UK"},
  {id:88,title:"Sixth of the Dusk",author:"Brandon Sanderson",year:2017,genre:"Fantasy",country:"USA"},
  {id:89,title:"Endless Night",author:"Agatha Christie",year:2018,genre:"Mystery",country:"UK"},
  {id:90,title:"The Murder of Roger Ackroyd",author:"Agatha Christie",year:2018,genre:"Mystery",country:"UK"},
  {id:91,title:"Zero to One",author:"Peter Thiel",year:2018,genre:"Non-Fiction",country:"USA"},
  {id:92,title:"Statistics: A Graphic Guide",author:"Eileen Magnello",year:2018,genre:"Non-Fiction",country:"UK"},
  {id:93,title:"The Emperor of All Maladies",author:"Siddhartha Mukherjee",year:2018,genre:"Science",country:"India"},
  {id:94,title:"The Legends of Halahala",author:"Appupen",year:2018,genre:"Graphic Novel",country:"India"},
  {id:95,title:"Seveneves",author:"Neal Stephenson",year:2018,genre:"Sci-Fi",country:"USA"},
  {id:96,title:"The Songs of Distant Earth",author:"Arthur C. Clarke",year:2018,genre:"Sci-Fi",country:"UK"},
  {id:97,title:"Aspyrus",author:"Appupen",year:2018,genre:"Graphic Novel",country:"India"},
  {id:98,title:"Sum",author:"David Eagleman",year:2018,genre:"Philosophy",country:"USA"},
  {id:99,title:"Oathbringer",author:"Brandon Sanderson",year:2018,genre:"Fantasy",country:"USA"},
  {id:100,title:"Arcanum Unbounded",author:"Brandon Sanderson",year:2018,genre:"Fantasy",country:"USA"},
  {id:101,title:"Enlightenment Now",author:"Steven Pinker",year:2018,genre:"Non-Fiction",country:"USA"},
  {id:102,title:"The Fox",author:"Frederick Forsyth",year:2018,genre:"Thriller",country:"UK"},
  {id:103,title:"Elon Musk",author:"Ashlee Vance",year:2018,genre:"Biography",country:"USA"},
  {id:104,title:"Origin",author:"Dan Brown",year:2018,genre:"Thriller",country:"USA"},
  {id:105,title:"The Hidden Life of Trees",author:"Peter Wohlleben",year:2018,genre:"Science",country:"Germany"},
  {id:106,title:"Cathedral",author:"Raymond Carver",year:2018,genre:"Literary Fiction",country:"USA"},
  {id:107,title:"Sita",author:"Amish Tripathi",year:2018,genre:"Fantasy",country:"India"},
  {id:108,title:"The Guernsey Literary and Potato Peel Pie Society",author:"Mary Ann Shaffer & Annie Barrows",year:2019,genre:"Literary Fiction",country:"USA"},
  {id:109,title:"When Breath Becomes Air",author:"Paul Kalanithi",year:2019,genre:"Memoir",country:"USA"},
  {id:110,title:"Marvel 1602",author:"Neil Gaiman",year:2019,genre:"Graphic Novel",country:"UK"},
  {id:111,title:"DC Universe: Rebirth",author:"Geoff Johns",year:2019,genre:"Graphic Novel",country:"USA"},
  {id:112,title:"All the Names They Used for God",author:"Anjali Sachdeva",year:2019,genre:"Literary Fiction",country:"USA"},
  {id:113,title:"The Pillars of the Earth",author:"Ken Follett",year:2019,genre:"Historical Fiction",country:"UK"},
  {id:114,title:"World Without End",author:"Ken Follett",year:2019,genre:"Historical Fiction",country:"UK"},
  {id:115,title:"The Sirens of Titan",author:"Kurt Vonnegut",year:2019,genre:"Sci-Fi",country:"USA"},
  {id:116,title:"A Column of Fire",author:"Ken Follett",year:2019,genre:"Historical Fiction",country:"UK"},
  {id:117,title:"How to Win an Indian Election",author:"Shivam Shankar Singh",year:2019,genre:"Non-Fiction",country:"India"},
  {id:118,title:"Em and the Big Hoom",author:"Jerry Pinto",year:2019,genre:"Literary Fiction",country:"India"},
  {id:119,title:"The Courtesan, the Mahatma & the Italian Brahmin",author:"Manu S. Pillai",year:2019,genre:"History",country:"India"},
  {id:120,title:"The Verdict",author:"Prannoy Roy & Dorab Sopariwala",year:2019,genre:"Non-Fiction",country:"India"},
  {id:121,title:"In Love with the World",author:"Yongey Mingyur Rinpoche",year:2019,genre:"Memoir",country:"Nepal"},
  {id:122,title:"A Fine Balance",author:"Rohinton Mistry",year:2019,genre:"Literary Fiction",country:"India"},
  {id:123,title:"The Ministry of Utmost Happiness",author:"Arundhati Roy",year:2019,genre:"Literary Fiction",country:"India"},
  {id:124,title:"Alice in Wonderland",author:"Lewis Carroll",year:2019,genre:"Classic",country:"UK"},
  {id:125,title:"Superforecasting",author:"Philip Tetlock & Dan Gardner",year:2019,genre:"Non-Fiction",country:"USA"},
  {id:126,title:"Skyward",author:"Brandon Sanderson",year:2019,genre:"Sci-Fi",country:"USA"},
  {id:127,title:"One Part Woman",author:"Perumal Murugan",year:2019,genre:"Literary Fiction",country:"India"},
  {id:128,title:"Gujarat Files",author:"Rana Ayyub",year:2019,genre:"Non-Fiction",country:"India"},
  {id:129,title:"I Am a Troll",author:"Swati Chaturvedi",year:2019,genre:"Non-Fiction",country:"India"},
  {id:130,title:"The Buddha's Non-Sectarian Teachings",author:"S.N. Goenka",year:2019,genre:"Philosophy",country:"India"},
  {id:131,title:"The 40 Rules of Love",author:"Elif Shafak",year:2020,genre:"Literary Fiction",country:"Turkey"},
  {id:132,title:"Eileen",author:"Ottessa Moshfegh",year:2020,genre:"Literary Fiction",country:"USA"},
  {id:133,title:"10 Minutes 38 Seconds in This Strange World",author:"Elif Shafak",year:2020,genre:"Literary Fiction",country:"Turkey"},
  {id:134,title:"A Suitable Boy",author:"Vikram Seth",year:2020,genre:"Literary Fiction",country:"India"},
  {id:135,title:"Open",author:"Andre Agassi",year:2020,genre:"Memoir",country:"USA"},
  {id:136,title:"Cari Mora",author:"Thomas Harris",year:2020,genre:"Thriller",country:"USA"},
  {id:137,title:"Einstein, His Life and Universe",author:"Walter Isaacson",year:2020,genre:"Biography",country:"USA"},
  {id:138,title:"Leonardo da Vinci",author:"Walter Isaacson",year:2020,genre:"Biography",country:"USA"},
  {id:139,title:"Ghalib, a Thousand Desires",author:"Raza Mir",year:2020,genre:"Non-Fiction",country:"India"},
  {id:140,title:"The Rise and Fall of the Dinosaurs",author:"Steve Brusatte",year:2020,genre:"Science",country:"USA"},
  {id:141,title:"A Gentleman in Moscow",author:"Amor Towles",year:2020,genre:"Historical Fiction",country:"USA"},
  {id:142,title:"Ishmael",author:"Daniel Quinn",year:2020,genre:"Philosophy",country:"USA"},
  {id:143,title:"No One Is Too Small to Make a Difference",author:"Greta Thunberg",year:2020,genre:"Non-Fiction",country:"Sweden"},
  {id:144,title:"The Ivory Throne",author:"Manu S. Pillai",year:2020,genre:"History",country:"India"},
  {id:145,title:"Born a Crime",author:"Trevor Noah",year:2020,genre:"Memoir",country:"South Africa"},
  {id:146,title:"An Astronaut's Guide to Life on Earth",author:"Chris Hadfield",year:2020,genre:"Memoir",country:"Canada"},
  {id:147,title:"I Am Malala",author:"Malala Yousafzai",year:2020,genre:"Memoir",country:"Pakistan"},
  {id:148,title:"Buddha Vol 1-8",author:"Osamu Tezuka",year:2020,genre:"Graphic Novel",country:"Japan"},
  {id:149,title:"The Shape of Ideas",author:"Grant Snider",year:2020,genre:"Graphic Novel",country:"USA"},
  {id:150,title:"The Audacity of Hope",author:"Barack Obama",year:2020,genre:"Non-Fiction",country:"USA"},
  {id:151,title:"Circe",author:"Madeline Miller",year:2020,genre:"Fantasy",country:"USA"},
  {id:152,title:"Becoming",author:"Michelle Obama",year:2020,genre:"Memoir",country:"USA"},
  {id:153,title:"I Will Judge You by Your Bookshelf",author:"Grant Snider",year:2020,genre:"Non-Fiction",country:"USA"},
  {id:154,title:"A Promised Land",author:"Barack Obama",year:2020,genre:"Non-Fiction",country:"USA"},
  {id:155,title:"Macbeth (Illustrated)",author:"Shakespeare & Matt Wiegle",year:2021,genre:"Classic",country:"UK"},
  {id:156,title:"To Sleep in a Sea of Stars",author:"Christopher Paolini",year:2021,genre:"Sci-Fi",country:"USA"},
  {id:157,title:"Caste",author:"Isabel Wilkerson",year:2021,genre:"Non-Fiction",country:"USA"},
  {id:158,title:"The Evening and the Morning",author:"Ken Follett",year:2021,genre:"Historical Fiction",country:"UK"},
  {id:159,title:"Sapiens",author:"Yuval Noah Harari",year:2021,genre:"Non-Fiction",country:"Israel"},
  {id:160,title:"Homo Deus",author:"Yuval Noah Harari",year:2021,genre:"Non-Fiction",country:"Israel"},
  {id:161,title:"How Not to Be Wrong",author:"Jordan Ellenberg",year:2021,genre:"Science",country:"USA"},
  {id:162,title:"Atomic Habits",author:"James Clear",year:2021,genre:"Self-Help",country:"USA"},
  {id:163,title:"Fall of Giants",author:"Ken Follett",year:2021,genre:"Historical Fiction",country:"UK"},
  {id:164,title:"21 Lessons for the 21st Century",author:"Yuval Noah Harari",year:2021,genre:"Non-Fiction",country:"Israel"},
  {id:165,title:"Romeo and Juliet (Illustrated)",author:"Shakespeare & Matt Wiegle",year:2021,genre:"Classic",country:"UK"},
  {id:166,title:"The Cock Is the Culprit",author:"Unni R.",year:2021,genre:"Literary Fiction",country:"India"},
  {id:167,title:"An Era of Darkness",author:"Shashi Tharoor",year:2021,genre:"History",country:"India"},
  {id:168,title:"A Tiger for Malgudi",author:"R.K. Narayan",year:2021,genre:"Literary Fiction",country:"India"},
  {id:169,title:"How to Avoid a Climate Disaster",author:"Bill Gates",year:2021,genre:"Non-Fiction",country:"USA"},
  {id:170,title:"The Reluctant Fundamentalist",author:"Mohsin Hamid",year:2021,genre:"Literary Fiction",country:"Pakistan"},
  {id:171,title:"Train to Pakistan",author:"Khushwant Singh",year:2021,genre:"Historical Fiction",country:"India"},
  {id:172,title:"The Spy and the Traitor",author:"Ben Macintyre",year:2021,genre:"Non-Fiction",country:"UK"},
  {id:173,title:"Yuganta",author:"Irawati Karve",year:2021,genre:"History",country:"India"},
  {id:174,title:"Crime and Punishment",author:"Fyodor Dostoevsky",year:2021,genre:"Classic",country:"Russia"},
  {id:175,title:"Meditations",author:"Marcus Aurelius",year:2021,genre:"Philosophy",country:"Rome"},
  {id:176,title:"Midnight's Children",author:"Salman Rushdie",year:2021,genre:"Literary Fiction",country:"India"},
  {id:177,title:"Born to Run",author:"Christopher McDougall",year:2021,genre:"Non-Fiction",country:"USA"},
  {id:178,title:"Artemis",author:"Andy Weir",year:2021,genre:"Sci-Fi",country:"USA"},
  {id:179,title:"Economics in One Lesson",author:"Henry Hazlitt",year:2021,genre:"Non-Fiction",country:"USA"},
  {id:180,title:"The Name of the Wind",author:"Patrick Rothfuss",year:2021,genre:"Fantasy",country:"USA"},
  {id:181,title:"Project Hail Mary",author:"Andy Weir",year:2021,genre:"Sci-Fi",country:"USA"},
  {id:182,title:"Nudge",author:"Thaler & Sunstein",year:2021,genre:"Non-Fiction",country:"USA"},
  {id:183,title:"The Wise Man's Fear",author:"Patrick Rothfuss",year:2021,genre:"Fantasy",country:"USA"},
  {id:184,title:"Annihilation of Caste",author:"B.R. Ambedkar",year:2021,genre:"Non-Fiction",country:"India"},
  {id:185,title:"A Feast of Vultures",author:"Josy Joseph",year:2021,genre:"Non-Fiction",country:"India"},
  {id:186,title:"The Case for Climate Capitalism",author:"Tom Rand",year:2021,genre:"Non-Fiction",country:"Canada"},
  {id:187,title:"In Service of the Republic",author:"Vijay Kelkar & Ajay Shah",year:2021,genre:"Non-Fiction",country:"India"},
  {id:188,title:"Silent Spring",author:"Rachel Carson",year:2021,genre:"Science",country:"USA"},
  {id:189,title:"Thinking, Fast and Slow",author:"Daniel Kahneman",year:2021,genre:"Non-Fiction",country:"Israel"},
  {id:190,title:"The Notebook, The Proof, The Third Lie",author:"Agota Kristof",year:2021,genre:"Literary Fiction",country:"Hungary"},
  {id:191,title:"Good Economics for Hard Times",author:"Banerjee & Duflo",year:2021,genre:"Non-Fiction",country:"India"},
  {id:192,title:"Poonachi",author:"Perumal Murugan",year:2021,genre:"Literary Fiction",country:"India"},
  {id:193,title:"This Changes Everything",author:"Naomi Klein",year:2021,genre:"Non-Fiction",country:"Canada"},
  {id:194,title:"The Five Love Languages",author:"Gary Chapman",year:2021,genre:"Self-Help",country:"USA"},
  {id:195,title:"Child 44",author:"Tom Rob Smith",year:2022,genre:"Thriller",country:"UK"},
  {id:196,title:"Starsight",author:"Brandon Sanderson",year:2022,genre:"Sci-Fi",country:"USA"},
  {id:197,title:"Systems Thinking",author:"Donella Meadows",year:2022,genre:"Non-Fiction",country:"USA"},
  {id:198,title:"A Court of Thorns and Roses",author:"Sarah J. Maas",year:2025,genre:"Fantasy",country:"USA"},
  {id:199,title:"Dawnshard",author:"Brandon Sanderson",year:2025,genre:"Fantasy",country:"USA"},
  {id:200,title:"Secret of Secrets",author:"Dan Brown",year:2025,genre:"Thriller",country:"USA"},
  {id:201,title:"Heart Lamp",author:"Banu Mushtaq",year:2025,genre:"Literary Fiction",country:"India"},
  {id:202,title:"The Silent Patient",author:"Alex Michaelides",year:2025,genre:"Thriller",country:"Cyprus"},
  {id:203,title:"Cinema Speculation",author:"Quentin Tarantino",year:2025,genre:"Non-Fiction",country:"USA"},
  {id:204,title:"A Court of Mist and Fury",author:"Sarah J. Maas",year:2026,genre:"Fantasy",country:"USA"},
  {id:205,title:"A Court of Wings and Ruin",author:"Sarah J. Maas",year:2026,genre:"Fantasy",country:"USA"},
  {id:206,title:"A Court of Frost and Starlight",author:"Sarah J. Maas",year:2026,genre:"Fantasy",country:"USA"},
  {id:207,title:"A Court of Silver Flames",author:"Sarah J. Maas",year:2026,genre:"Fantasy",country:"USA"},
  {id:208,title:"Fourth Wing",author:"Rebecca Yarros",year:2026,genre:"Fantasy",country:"USA"},
  {id:209,title:"Iron Flame",author:"Rebecca Yarros",year:2026,genre:"Fantasy",country:"USA"},
  {id:210,title:"Onyx Storm",author:"Rebecca Yarros",year:2026,genre:"Fantasy",country:"USA"},
  {id:211,title:"Tress of the Emerald Sea",author:"Brandon Sanderson",year:2026,genre:"Fantasy",country:"USA"},
  {id:212,title:"Yumi and the Nightmare Painter",author:"Brandon Sanderson",year:2026,genre:"Fantasy",country:"USA"},
];

const READING_CONTEXT = `This reader has consumed 212+ books across 15 years (2011–2026). Key patterns:

TOP AUTHORS: Brandon Sanderson (25+ books – Mistborn, Stormlight Archive, Skyward, Cosmere novellas), J.K. Rowling (8 HP books), Christopher Paolini (5 – Eragon + sci-fi), Ken Follett (5 – Kingsbridge series), Agatha Christie (4 mysteries), Amish Tripathi (5 Indian mythology fantasy), Robert Jordan (3 WoT), Dan Brown (4 thrillers), Andy Weir (3 sci-fi), Walter Isaacson (3 biographies), Yuval Noah Harari (3 non-fiction), Perumal Murugan (2 Indian literary), Arundhati Roy (2), Appupen (3 Indian graphic novels), Barack Obama (2), Elif Shafak (2), Patrick Rothfuss (2), Sarah J. Maas (5 ACOTAR), Rebecca Yarros (3 Empyrean).

GENRES (ranked): Fantasy (~70 books) > Non-Fiction (~45) > Literary Fiction (~30) > Sci-Fi (~20) > Thriller/Mystery (~20) > Graphic Novel (~18) > Memoir/Biography (~15) > Classic (~8) > Historical Fiction (~10) > Philosophy (~7) > Science (~8) > History (~7) > Self-Help (4) > Horror (2) > Travel (2).

YEAR HIGHLIGHTS: 2011 (first big fantasy year), 2012 (deep Sanderson dive), 2013 (Indian mythology, epic fantasy), 2015 (125-day world tour – minimal reading), 2016 (Harry Potter re-read), 2018-19 (literary fiction surge), 2020-21 (pandemic reading peak – 24+40 books), 2022 (sudden drop to 3), 2023-24 (READING HIATUS), 2025-26 (comeback with romantasy – ACOTAR + Empyrean).

STRONG INTERESTS: Epic fantasy, Indian literature (classical and contemporary), science non-fiction, historical fiction, Indian history and politics, philosophy, graphic novels (especially Indian artists like Appupen), biographies of scientists/leaders.

POTENTIAL GAPS: Literary romance, poetry, westerns, African literature (beyond Trevor Noah/Malala), Japanese fiction beyond manga, Latin American magical realism beyond Marquez, contemporary crime procedurals, Nordic noir beyond Nesbo.

RECENT DIRECTION (2025-26): Clear romantasy phase – ACOTAR series + Empyrean series. Suggests appetite for character-driven fantasy with romance elements, not just plot-heavy epic fantasy.`;

// ── TOOLTIP ───────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: G.muted, fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || G.gold, fontSize: 13, fontWeight: 600 }}>
          {p.name !== "count" && p.name !== undefined ? `${p.name}: ` : ""}{p.value}
        </p>
      ))}
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [search, setSearch] = useState("");
  const [libGenre, setLibGenre] = useState("All");
  const [libYear, setLibYear] = useState("All");
  const [libSort, setLibSort] = useState("year");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I know your complete reading history — 212 books across 15 years. Ask me anything: your patterns, what to read next, your top authors, surprising stats, or anything else!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsGenre, setRecsGenre] = useState("Fantasy");
  const [newBook, setNewBook] = useState({ title: "", author: "", year: 2026, genre: "Fantasy", country: "" });
  const [addMsg, setAddMsg] = useState("");
  const chatEndRef = useRef(null);
  const nextId = useRef(213);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── COMPUTED DATA ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byYear = {}, byGenre = {}, byAuthor = {}, byCountry = {};
    books.forEach(b => {
      byYear[b.year] = (byYear[b.year] || 0) + 1;
      byGenre[b.genre] = (byGenre[b.genre] || 0) + 1;
      byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
      if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
    });
    const sortedAuthors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]);
    const sortedGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]);
    const sortedYears = Object.entries(byYear).sort((a, b) => b[1] - a[1]);
    return { total: books.length, byYear, byGenre, byAuthor, byCountry, sortedAuthors, sortedGenres, sortedYears };
  }, [books]);

  const booksPerYear = useMemo(() =>
    Object.entries(stats.byYear).sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count })), [stats]);

  const genreChartData = useMemo(() =>
    stats.sortedGenres.slice(0, 12).map(([genre, count]) => ({ genre, count })), [stats]);

  const authorChartData = useMemo(() =>
    stats.sortedAuthors.slice(0, 12).map(([author, count]) => ({ author, count })), [stats]);

  const countryChartData = useMemo(() =>
    Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([country, count]) => ({ country, count })), [stats]);

  const topGenres5 = useMemo(() => stats.sortedGenres.slice(0, 5).map(([g]) => g), [stats]);

  const genreEvolution = useMemo(() => {
    const years = Object.keys(stats.byYear).sort();
    return years.map(year => {
      const entry = { year };
      topGenres5.forEach(g => {
        entry[g] = books.filter(b => b.year === parseInt(year) && b.genre === g).length;
      });
      return entry;
    });
  }, [books, stats, topGenres5]);

  const fictionVsNf = useMemo(() => {
    const fGen = new Set(["Fantasy", "Sci-Fi", "Thriller", "Mystery", "Literary Fiction", "Historical Fiction", "Classic", "Horror"]);
    const years = Object.keys(stats.byYear).sort();
    return years.map(year => {
      const yb = books.filter(b => b.year === parseInt(year));
      return { year, Fiction: yb.filter(b => fGen.has(b.genre)).length, "Non-Fiction": yb.filter(b => !fGen.has(b.genre)).length };
    });
  }, [books, stats]);

  const filteredBooks = useMemo(() =>
    books.filter(b => {
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false;
      if (libGenre !== "All" && b.genre !== libGenre) return false;
      if (libYear !== "All" && b.year !== parseInt(libYear)) return false;
      return true;
    }).sort((a, b) => {
      if (libSort === "year") return b.year - a.year;
      if (libSort === "title") return a.title.localeCompare(b.title);
      if (libSort === "author") return a.author.localeCompare(b.author);
      return 0;
    }), [books, search, libGenre, libYear, libSort]);

  const allGenres = useMemo(() => ["All", ...Object.keys(GENRE_COLORS)], []);
  const allYears = useMemo(() => ["All", ...Object.keys(stats.byYear).sort().reverse()], [stats]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are a witty, insightful personal reading assistant. Here is the user's complete reading history:\n\n${READING_CONTEXT}\n\nAnswer questions about their reading habits with specific details, surprising insights, and genuine personality. Be conversational and direct.`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || "Sorry, try again." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]); }
    finally { setChatLoading(false); }
  };

  const fetchRecs = async () => {
    setRecsLoading(true); setRecs(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1500,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `You are a book recommendation engine. The user's reading history: ${READING_CONTEXT}\n\nReturn ONLY a JSON array (no markdown, no preamble) of 8 book recommendations for genre: ${recsGenre}. Each object: {title, author, year (publication year as number), description (1-2 sentences), whyItFitsYou (specific reason based on their history, 1 sentence), isNew (boolean, true if 2023 or later)}. Mix classics/established favorites with new 2024-2026 releases. Search for very recent releases.`,
          messages: [{ role: "user", content: `Recommend ${recsGenre} books for me. Include some 2024-2026 new releases. Return JSON array only.` }]
        })
      });
      const data = await res.json();
      const txt = data.content.filter(c => c.type === "text").map(c => c.text).join("");
      try {
        const m = txt.match(/\[[\s\S]*\]/);
        setRecs(m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim()));
      } catch { setRecs([{ title: "Parse error", author: "", year: 0, description: txt.slice(0, 200), whyItFitsYou: "", isNew: false }]); }
    } catch { setRecs([{ title: "Error", author: "", year: 0, description: "Could not fetch recommendations.", whyItFitsYou: "", isNew: false }]); }
    finally { setRecsLoading(false); }
  };

  const addBook = () => {
    if (!newBook.title.trim() || !newBook.author.trim()) { setAddMsg("Title and author are required."); return; }
    setBooks(prev => [...prev, { ...newBook, id: nextId.current++, year: parseInt(newBook.year) }]);
    setNewBook({ title: "", author: "", year: 2026, genre: "Fantasy", country: "" });
    setAddMsg(`✓ "${newBook.title}" added to your library!`);
    setTimeout(() => setAddMsg(""), 4000);
  };

  const downloadCSV = () => {
    const rows = [["ID","Title","Author","Year","Genre","Country"], ...books.map(b => [b.id, `"${b.title}"`, `"${b.author}"`, b.year, b.genre, b.country || ""])];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.csv" });
    a.click();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.json" });
    a.click();
  };

  // ── STYLES ────────────────────────────────────────────────────────────────
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${G.bg}; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${G.bg}; }
    ::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    .tab-btn { cursor: pointer; padding: 8px 18px; border-radius: 6px; border: 1px solid transparent; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; transition: all 0.2s; white-space: nowrap; }
    .tab-btn:hover { background: ${G.card2}; }
    .tab-btn.active { background: ${G.card2}; border-color: ${G.goldDim}; color: ${G.gold}; }
    .stat-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 20px 24px; transition: border-color 0.2s; }
    .stat-card:hover { border-color: ${G.goldDim}; }
    .genre-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
    .input-dark { background: ${G.card2}; border: 1px solid ${G.border}; border-radius: 8px; color: ${G.text}; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; outline: none; transition: border-color 0.2s; }
    .input-dark:focus { border-color: ${G.goldDim}; }
    .btn-gold { background: ${G.gold}; color: #000; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-gold:hover { background: ${G.goldLight}; }
    .btn-ghost { background: transparent; color: ${G.muted}; border: 1px solid ${G.border}; border-radius: 8px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { color: ${G.text}; border-color: ${G.dimmed}; }
    .rec-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 18px; transition: all 0.2s; }
    .rec-card:hover { border-color: ${G.goldDim}; transform: translateY(-1px); }
    .chat-input-wrap { display: flex; gap: 10px; }
    .lib-row { display: grid; grid-template-columns: 1fr 140px 100px 90px; gap: 12px; padding: 10px 16px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .lib-row:hover { background: ${G.card2}; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
  `;

  // ── TABS CONFIG ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview", icon: "◎", label: "Overview" },
    { id: "analytics", icon: "▦", label: "Analytics" },
    { id: "library", icon: "≡", label: "Library" },
    { id: "add", icon: "+", label: "Add Book" },
    { id: "recs", icon: "✦", label: "Recommendations" },
    { id: "chat", icon: "◈", label: "AI Chat" },
  ];

  const REC_GENRES = ["Fantasy", "Sci-Fi", "Literary Fiction", "Thriller", "Historical Fiction", "Non-Fiction", "Mystery", "Classic"];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{ padding: "28px 28px 0", borderBottom: `1px solid ${G.border}`, paddingBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: G.text, letterSpacing: "-0.3px" }}>
              Nairrative
            </div>
            <div style={{ color: G.muted, fontSize: 12, marginTop: 3, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              {stats.total} books <span style={{ color: G.gold }}>•</span> The Reading Project
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, paddingBottom: 2 }}>
            <button className="btn-ghost" onClick={downloadCSV}>↓ CSV</button>
            <button className="btn-ghost" onClick={downloadJSON}>↓ JSON</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 20, overflowX: "auto", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              style={{ color: activeTab === t.id ? G.gold : G.muted }}
              onClick={() => setActiveTab(t.id)}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 24, maxHeight: "calc(100vh - 130px)", overflowY: "auto" }} className="fade-in">

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Books Read", value: stats.total, color: G.gold },
                { label: "Years Reading", value: Object.keys(stats.byYear).length, color: G.blue },
                { label: "Peak Year", value: `${stats.sortedYears[0]?.[0]} (${stats.sortedYears[0]?.[1]})`, color: G.green },
                { label: "#1 Author", value: stats.sortedAuthors[0]?.[0].split(" ").slice(-1)[0], sub: `${stats.sortedAuthors[0]?.[1]} books`, color: G.purple },
                { label: "Top Genre", value: stats.sortedGenres[0]?.[0], sub: `${stats.sortedGenres[0]?.[1]} books`, color: "#ff9f7f" },
                { label: "Authors Read", value: new Set(books.map(b => b.author)).size, color: "#81ecec" },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  {s.sub && <div style={{ color: G.muted, fontSize: 11, marginTop: 4 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Books Per Year */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 20px 12px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 16, color: G.text }}>Reading Activity by Year</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={booksPerYear} barSize={22}>
                  <CartesianGrid stroke={G.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {booksPerYear.map((e, i) => (
                      <Cell key={i} fill={e.count === Math.max(...booksPerYear.map(b => b.count)) ? G.gold : G.goldDim} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Genre Distribution */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 20px 12px" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 16 }}>Genre Breakdown</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={genreChartData} layout="vertical" barSize={14}>
                  <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="genre" tick={{ fill: G.text, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {genreChartData.map((e, i) => (
                      <Cell key={i} fill={GENRE_COLORS[e.genre] || G.muted} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div>
            {/* Fiction vs Non-Fiction */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 20px 12px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 4 }}>Fiction vs Non-Fiction Over Time</div>
              <div style={{ color: G.muted, fontSize: 12, marginBottom: 16 }}>How your reading balance has shifted across the years</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={fictionVsNf}>
                  <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ color: G.muted, fontSize: 12 }} />
                  <Area type="monotone" dataKey="Fiction" stackId="1" stroke={G.gold} fill={G.gold} fillOpacity={0.35} />
                  <Area type="monotone" dataKey="Non-Fiction" stackId="1" stroke={G.blue} fill={G.blue} fillOpacity={0.35} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Genres Evolution */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 20px 12px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 4 }}>Genre Evolution</div>
              <div style={{ color: G.muted, fontSize: 12, marginBottom: 16 }}>Top 5 genres tracked over your reading journey</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={genreEvolution}>
                  <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ color: G.muted, fontSize: 11 }} />
                  {topGenres5.map(g => (
                    <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={GENRE_COLORS[g]} fill={GENRE_COLORS[g]} fillOpacity={0.5} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top Authors */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 20px 12px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 16 }}>Top Authors by Books Read</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={authorChartData} layout="vertical" barSize={13}>
                  <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="author" tick={{ fill: G.text, fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" fill={G.gold} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Country of Authors */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 20px 12px" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 4 }}>Author Origins</div>
              <div style={{ color: G.muted, fontSize: 12, marginBottom: 16 }}>Where your favourite storytellers come from</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={countryChartData} layout="vertical" barSize={13}>
                  <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: G.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="country" tick={{ fill: G.text, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" fill={G.green} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <input className="input-dark" style={{ maxWidth: 260 }} placeholder="Search title or author…" value={search} onChange={e => setSearch(e.target.value)} />
              <select className="input-dark" style={{ maxWidth: 140 }} value={libGenre} onChange={e => setLibGenre(e.target.value)}>
                {allGenres.map(g => <option key={g}>{g}</option>)}
              </select>
              <select className="input-dark" style={{ maxWidth: 100 }} value={libYear} onChange={e => setLibYear(e.target.value)}>
                {allYears.map(y => <option key={y}>{y}</option>)}
              </select>
              <select className="input-dark" style={{ maxWidth: 120 }} value={libSort} onChange={e => setLibSort(e.target.value)}>
                <option value="year">Sort: Year</option>
                <option value="title">Sort: Title</option>
                <option value="author">Sort: Author</option>
              </select>
              <div style={{ color: G.muted, fontSize: 12, alignSelf: "center" }}>{filteredBooks.length} books</div>
            </div>

            {/* Table Header */}
            <div className="lib-row" style={{ background: G.card2, borderRadius: "8px 8px 0 0", borderBottom: `1px solid ${G.border}` }}>
              {["Title", "Author", "Genre", "Year"].map(h => (
                <div key={h} style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 420, overflowY: "auto" }}>
              {filteredBooks.map(b => (
                <div key={b.id} className="lib-row">
                  <div style={{ fontSize: 13, fontWeight: 500, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: G.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.author}</div>
                  <div>
                    <span className="genre-pill" style={{ background: `${GENRE_COLORS[b.genre] || G.dimmed}20`, color: GENRE_COLORS[b.genre] || G.muted }}>
                      {b.genre}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.year}</div>
                </div>
              ))}
              {filteredBooks.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: G.muted }}>No books match your filters.</div>
              )}
            </div>
          </div>
        )}

        {/* ── ADD BOOK ───────────────────────────────────────────────────── */}
        {activeTab === "add" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6 }}>Log a New Book</div>
            <div style={{ color: G.muted, fontSize: 13, marginBottom: 24 }}>Add it to your permanent reading record</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Title *</div>
                <input className="input-dark" placeholder="e.g. The Name of the Wind" value={newBook.title} onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Author *</div>
                <input className="input-dark" placeholder="e.g. Patrick Rothfuss" value={newBook.author} onChange={e => setNewBook(p => ({ ...p, author: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Year</div>
                  <input className="input-dark" type="number" min="1900" max="2030" value={newBook.year} onChange={e => setNewBook(p => ({ ...p, year: e.target.value }))} />
                </div>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Genre</div>
                  <select className="input-dark" value={newBook.genre} onChange={e => setNewBook(p => ({ ...p, genre: e.target.value }))}>
                    {Object.keys(GENRE_COLORS).map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Country of Author (optional)</div>
                <input className="input-dark" placeholder="e.g. USA" value={newBook.country} onChange={e => setNewBook(p => ({ ...p, country: e.target.value }))} />
              </div>
              <button className="btn-gold" style={{ marginTop: 6 }} onClick={addBook}>Add to My Library</button>
              {addMsg && (
                <div style={{ padding: "12px 16px", borderRadius: 8, background: addMsg.startsWith("✓") ? "#1a2e1a" : "#2e1a1a", border: `1px solid ${addMsg.startsWith("✓") ? "#2d5a2d" : "#5a2d2d"}`, color: addMsg.startsWith("✓") ? G.green : G.red, fontSize: 13 }}>
                  {addMsg}
                </div>
              )}
            </div>

            {/* Recent Additions */}
            {books.length > INITIAL_BOOKS.length && (
              <div style={{ marginTop: 32 }}>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Recently Added This Session</div>
                {books.slice(INITIAL_BOOKS.length).reverse().map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</span>
                      <span style={{ color: G.muted, fontSize: 12, marginLeft: 8 }}>by {b.author}</span>
                    </div>
                    <span className="genre-pill" style={{ background: `${GENRE_COLORS[b.genre] || G.dimmed}20`, color: GENRE_COLORS[b.genre] || G.muted }}>{b.genre}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECOMMENDATIONS ────────────────────────────────────────────── */}
        {activeTab === "recs" && (
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6 }}>AI Recommendations</div>
            <div style={{ color: G.muted, fontSize: 13, marginBottom: 20 }}>Personalized picks based on your reading DNA — including the latest 2024–26 releases</div>

            {/* Genre Selector */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {REC_GENRES.map(g => (
                <button key={g} onClick={() => setRecsGenre(g)}
                  style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${recsGenre === g ? GENRE_COLORS[g] || G.gold : G.border}`, background: recsGenre === g ? `${GENRE_COLORS[g] || G.gold}18` : "transparent", color: recsGenre === g ? GENRE_COLORS[g] || G.gold : G.muted, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
                  {g}
                </button>
              ))}
            </div>

            <button className="btn-gold" onClick={fetchRecs} disabled={recsLoading}>
              {recsLoading ? "Searching & Thinking…" : `✦ Get ${recsGenre} Recommendations`}
            </button>

            {recsLoading && (
              <div style={{ marginTop: 40, textAlign: "center" }}>
                <div className="pulse" style={{ color: G.gold, fontFamily: "'Playfair Display', serif", fontSize: 16 }}>Consulting your reading history + searching for new releases…</div>
              </div>
            )}

            {recs && !recsLoading && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                  {recs.map((r, i) => (
                    <div key={i} className="rec-card">
                      {r.isNew && (
                        <span style={{ display: "inline-block", background: `${G.green}20`, color: G.green, fontSize: 10, fontWeight: 700, letterSpacing: "1px", padding: "2px 8px", borderRadius: 20, marginBottom: 10, textTransform: "uppercase" }}>
                          New Release
                        </span>
                      )}
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: G.text, marginBottom: 4, lineHeight: 1.3 }}>{r.title}</div>
                      <div style={{ color: G.gold, fontSize: 12, marginBottom: 10 }}>{r.author} · {r.year}</div>
                      <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{r.description}</div>
                      {r.whyItFitsYou && (
                        <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 10, color: G.text, fontSize: 12, fontStyle: "italic", opacity: 0.8 }}>
                          ✦ {r.whyItFitsYou}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!recs && !recsLoading && (
              <div style={{ marginTop: 40, textAlign: "center", color: G.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
                <div style={{ fontSize: 14 }}>Select a genre above and hit the button to get personalized recommendations.</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Claude will search for new 2024–26 releases alongside timeless picks.</div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT ──────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4 }}>Chat with Your Reading Data</div>
            <div style={{ color: G.muted, fontSize: 12, marginBottom: 16 }}>Ask anything — patterns, recommendations, deep dives, what you've forgotten you read…</div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "82%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role === "user" ? `${G.gold}18` : G.card2,
                    border: `1px solid ${m.role === "user" ? G.goldDim : G.border}`,
                    color: G.text, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap"
                  }}>
                    {m.role === "assistant" && <div style={{ color: G.gold, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>◈ Reading AI</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ padding: "12px 16px", background: G.card2, border: `1px solid ${G.border}`, borderRadius: "12px 12px 12px 2px" }}>
                    <div className="pulse" style={{ color: G.gold, fontSize: 13 }}>Thinking…</div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-wrap" style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
              <input className="input-dark" placeholder="Ask about your reading history, patterns, recommendations…"
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} />
              <button className="btn-gold" onClick={sendChat} disabled={chatLoading} style={{ whiteSpace: "nowrap" }}>Send</button>
            </div>

            {/* Suggestion chips */}
            {messages.length === 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {["What were my peak reading years?", "Which authors have I read the most?", "Analyze my genre evolution", "What's my fiction vs non-fiction ratio?", "What books did I read in 2021?", "Suggest what to read next"].map(s => (
                  <button key={s} className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { setChatInput(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}