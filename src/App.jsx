import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend
} from "recharts";

// ── THEME ──────────────────────────────────────────────────────────────────
const G = {
  gold: "#2d6a4f", goldLight: "#3d8a66", goldDim: "#6aab8a",
  copper: "#c0522a",
  blue: "#2563eb", red: "#dc2626", green: "#0e9488", purple: "#7c3aed",
  bg: "#f7f8fa", card: "#ffffff", card2: "#f0f2f6", border: "#e4e7ed",
  text: "#111827", muted: "#6b7280", dimmed: "#d1d5db", hover: "#e8eaef",
};

const GENRE_COLORS = {
  "Fantasy": "#c9a84c", "Sci-Fi": "#4a9eff", "Thriller": "#e06c75",
  "Mystery": "#ff9f7f", "Literary Fiction": "#98d8c8", "Historical Fiction": "#c3a6ff",
  "Non-Fiction": "#ffd166", "Graphic Novel": "#06d6a0", "Memoir": "#74b9ff",
  "Biography": "#81ecec", "Classic": "#fab1a0", "Philosophy": "#a29bfe",
  "Popular Science": "#55c9a0", "Self-Help": "#fdcb6e", "Travel": "#e17055",
  "Horror": "#b2bec3", "History": "#dfe6e9", "Politics": "#fd79a8",
  "Economics": "#fdcb6e", "Psychology": "#6c5ce7", "Business": "#00b894",
};

// ── ALL BOOKS ──────────────────────────────────────────────────────────────
const INITIAL_BOOKS = [
  { id: 1, title: "The Naked Face", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 224, fiction: true, series: "", notes: "" },
  { id: 2, title: "The Other Side of Midnight", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 528, fiction: true, series: "", notes: "" },
  { id: 3, title: "A Stranger in the Mirror", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 4, title: "Bloodline", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 5, title: "Rage of Angels", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 512, fiction: true, series: "", notes: "" },
  { id: 6, title: "Master of the Game", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 512, fiction: true, series: "", notes: "" },
  { id: 7, title: "If Tomorrow Comes", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 400, fiction: true, series: "", notes: "" },
  { id: 8, title: "Windmills of the Gods", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 9, title: "The Sands of Time", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 10, title: "Memories of Midnight", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 11, title: "The Doomsday Conspiracy", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 12, title: "The Stars Shine Down", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 13, title: "Nothing Lasts Forever", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 288, fiction: true, series: "", notes: "" },
  { id: 14, title: "Morning Noon and Night", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 304, fiction: true, series: "", notes: "" },
  { id: 15, title: "The Best Laid Plans", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 16, title: "Tell Me Your Dreams", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 320, fiction: true, series: "", notes: "" },
  { id: 17, title: "The Sky is Falling", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 320, fiction: true, series: "", notes: "" },
  { id: 18, title: "Are You Afraid of the Dark?", author: "Sidney Sheldon", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 19, title: "The Andromeda Strain", author: "Michael Crichton", year: 2010, genre: "Sci-Fi", country: "USA", pages: 288, fiction: true, series: "", notes: "" },
  { id: 20, title: "The Terminal Man", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 247, fiction: true, series: "", notes: "" },
  { id: 21, title: "The Great Train Robbery", author: "Michael Crichton", year: 2010, genre: "Historical Fiction", country: "USA", pages: 266, fiction: true, series: "", notes: "" },
  { id: 22, title: "Congo", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 348, fiction: true, series: "", notes: "" },
  { id: 23, title: "Sphere", author: "Michael Crichton", year: 2010, genre: "Sci-Fi", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 24, title: "Jurassic Park", author: "Michael Crichton", year: 2010, genre: "Sci-Fi", country: "USA", pages: 448, fiction: true, series: "Jurassic Park", notes: "" },
  { id: 25, title: "Rising Sun", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 26, title: "Disclosure", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 397, fiction: true, series: "", notes: "" },
  { id: 27, title: "The Lost World", author: "Michael Crichton", year: 2010, genre: "Sci-Fi", country: "USA", pages: 393, fiction: true, series: "Jurassic Park", notes: "" },
  { id: 28, title: "Airframe", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 397, fiction: true, series: "", notes: "" },
  { id: 29, title: "Timeline", author: "Michael Crichton", year: 2010, genre: "Sci-Fi", country: "USA", pages: 480, fiction: true, series: "", notes: "" },
  { id: 30, title: "Prey", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 376, fiction: true, series: "", notes: "" },
  { id: 31, title: "State of Fear", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 567, fiction: true, series: "", notes: "" },
  { id: 32, title: "Next", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 432, fiction: true, series: "", notes: "" },
  { id: 33, title: "Pirate Latitudes", author: "Michael Crichton", year: 2010, genre: "Thriller", country: "USA", pages: 312, fiction: true, series: "", notes: "Posthumous" },
  { id: 34, title: "The Day of the Jackal", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 380, fiction: true, series: "", notes: "" },
  { id: 35, title: "The Odessa File", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 312, fiction: true, series: "", notes: "" },
  { id: 36, title: "The Dogs of War", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 408, fiction: true, series: "", notes: "" },
  { id: 37, title: "The Fourth Protocol", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 415, fiction: true, series: "", notes: "" },
  { id: 38, title: "The Fist of God", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 511, fiction: true, series: "", notes: "" },
  { id: 39, title: "Icon", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 496, fiction: true, series: "", notes: "" },
  { id: 40, title: "The Bourne Identity", author: "Robert Ludlum", year: 2010, genre: "Thriller", country: "USA", pages: 523, fiction: true, series: "Bourne", notes: "" },
  { id: 41, title: "The Bourne Supremacy", author: "Robert Ludlum", year: 2010, genre: "Thriller", country: "USA", pages: 597, fiction: true, series: "Bourne", notes: "" },
  { id: 42, title: "The Bourne Ultimatum", author: "Robert Ludlum", year: 2010, genre: "Thriller", country: "USA", pages: 608, fiction: true, series: "Bourne", notes: "" },
  { id: 43, title: "The Sigma Protocol", author: "Robert Ludlum", year: 2010, genre: "Thriller", country: "USA", pages: 576, fiction: true, series: "", notes: "" },
  { id: 44, title: "The Matarese Circle", author: "Robert Ludlum", year: 2010, genre: "Thriller", country: "USA", pages: 601, fiction: true, series: "", notes: "" },
  { id: 45, title: "The Bourne Legacy", author: "Eric Van Lustbader", year: 2010, genre: "Thriller", country: "USA", pages: 432, fiction: true, series: "Bourne", notes: "" },
  { id: 46, title: "The Bourne Betrayal", author: "Eric Van Lustbader", year: 2010, genre: "Thriller", country: "USA", pages: 432, fiction: true, series: "Bourne", notes: "" },
  { id: 47, title: "The Firm", author: "John Grisham", year: 2010, genre: "Thriller", country: "USA", pages: 421, fiction: true, series: "", notes: "" },
  { id: 48, title: "The Pelican Brief", author: "John Grisham", year: 2010, genre: "Thriller", country: "USA", pages: 432, fiction: true, series: "", notes: "" },
  { id: 49, title: "The Client", author: "John Grisham", year: 2010, genre: "Thriller", country: "USA", pages: 422, fiction: true, series: "", notes: "" },
  { id: 50, title: "A Time to Kill", author: "John Grisham", year: 2010, genre: "Thriller", country: "USA", pages: 515, fiction: true, series: "", notes: "" },
  { id: 51, title: "The Rainmaker", author: "John Grisham", year: 2010, genre: "Thriller", country: "USA", pages: 466, fiction: true, series: "", notes: "" },
  { id: 52, title: "Coma", author: "Robin Cook", year: 2010, genre: "Thriller", country: "USA", pages: 296, fiction: true, series: "", notes: "" },
  { id: 53, title: "Brain", author: "Robin Cook", year: 2010, genre: "Thriller", country: "USA", pages: 340, fiction: true, series: "", notes: "" },
  { id: 54, title: "Terminal", author: "Robin Cook", year: 2010, genre: "Thriller", country: "USA", pages: 364, fiction: true, series: "", notes: "" },
  { id: 55, title: "Toxin", author: "Robin Cook", year: 2010, genre: "Thriller", country: "USA", pages: 352, fiction: true, series: "", notes: "" },
  { id: 56, title: "Hotel", author: "Arthur Hailey", year: 2010, genre: "Thriller", country: "UK", pages: 376, fiction: true, series: "", notes: "" },
  { id: 57, title: "Airport", author: "Arthur Hailey", year: 2010, genre: "Thriller", country: "UK", pages: 440, fiction: true, series: "", notes: "" },
  { id: 58, title: "Wheels", author: "Arthur Hailey", year: 2010, genre: "Thriller", country: "UK", pages: 374, fiction: true, series: "", notes: "" },
  { id: 59, title: "Not a Penny More, Not a Penny Less", author: "Jeffrey Archer", year: 2010, genre: "Thriller", country: "UK", pages: 272, fiction: true, series: "", notes: "" },
  { id: 60, title: "Shall We Tell the President?", author: "Jeffrey Archer", year: 2010, genre: "Thriller", country: "UK", pages: 308, fiction: true, series: "", notes: "" },
  { id: 61, title: "Kane and Abel", author: "Jeffrey Archer", year: 2010, genre: "Literary Fiction", country: "UK", pages: 540, fiction: true, series: "", notes: "" },
  { id: 62, title: "First Among Equals", author: "Jeffrey Archer", year: 2010, genre: "Thriller", country: "UK", pages: 432, fiction: true, series: "", notes: "" },
  { id: 63, title: "A Quiver Full of Arrows", author: "Jeffrey Archer", year: 2010, genre: "Thriller", country: "UK", pages: 224, fiction: true, series: "", notes: "" },
  { id: 64, title: "A Twist in the Tale", author: "Jeffrey Archer", year: 2010, genre: "Thriller", country: "UK", pages: 256, fiction: true, series: "", notes: "" },
  { id: 65, title: "The Hunt for Red October", author: "Tom Clancy", year: 2010, genre: "Thriller", country: "USA", pages: 387, fiction: true, series: "", notes: "" },
  { id: 66, title: "The Sum of All Fears", author: "Tom Clancy", year: 2010, genre: "Thriller", country: "USA", pages: 798, fiction: true, series: "", notes: "" },
  { id: 67, title: "Lucky", author: "Jackie Collins", year: 2010, genre: "Thriller", country: "UK", pages: 544, fiction: true, series: "", notes: "" },
  { id: 68, title: "Foundation", author: "Isaac Asimov", year: 2010, genre: "Sci-Fi", country: "USA", pages: 244, fiction: true, series: "Foundation", notes: "" },
  { id: 69, title: "Foundation and Empire", author: "Isaac Asimov", year: 2010, genre: "Sci-Fi", country: "USA", pages: 247, fiction: true, series: "Foundation", notes: "" },
  { id: 70, title: "Second Foundation", author: "Isaac Asimov", year: 2010, genre: "Sci-Fi", country: "USA", pages: 243, fiction: true, series: "Foundation", notes: "" },
  { id: 71, title: "2001: A Space Odyssey", author: "Arthur C. Clarke", year: 2010, genre: "Sci-Fi", country: "UK", pages: 297, fiction: true, series: "Space Odyssey", notes: "" },
  { id: 72, title: "Dune", author: "Frank Herbert", year: 2010, genre: "Sci-Fi", country: "USA", pages: 688, fiction: true, series: "Dune", notes: "" },
  { id: 73, title: "A Scanner Darkly", author: "Philip K. Dick", year: 2010, genre: "Sci-Fi", country: "USA", pages: 224, fiction: true, series: "", notes: "" },
  { id: 74, title: "Neuromancer", author: "William Gibson", year: 2010, genre: "Sci-Fi", country: "USA", pages: 271, fiction: true, series: "Sprawl Trilogy", notes: "" },
  { id: 75, title: "Snow Crash", author: "Neal Stephenson", year: 2010, genre: "Sci-Fi", country: "USA", pages: 468, fiction: true, series: "", notes: "" },
  { id: 76, title: "Ender's Game", author: "Orson Scott Card", year: 2010, genre: "Sci-Fi", country: "USA", pages: 226, fiction: true, series: "Ender's Game", notes: "" },
  { id: 77, title: "The Time Machine", author: "H.G. Wells", year: 2010, genre: "Sci-Fi", country: "UK", pages: 118, fiction: true, series: "", notes: "" },
  { id: 78, title: "Rainbows End", author: "Vernor Vinge", year: 2010, genre: "Sci-Fi", country: "USA", pages: 380, fiction: true, series: "", notes: "" },
  { id: 79, title: "Slaughterhouse-Five", author: "Kurt Vonnegut", year: 2010, genre: "Sci-Fi", country: "USA", pages: 215, fiction: true, series: "", notes: "" },
  { id: 80, title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", year: 2010, genre: "Sci-Fi", country: "UK", pages: 193, fiction: true, series: "Hitchhiker's Guide", notes: "" },
  { id: 81, title: "Broca's Brain", author: "Carl Sagan", year: 2010, genre: "Popular Science", country: "USA", pages: 347, fiction: false, series: "", notes: "" },
  { id: 82, title: "Guns, Germs, and Steel", author: "Jared Diamond", year: 2010, genre: "History", country: "USA", pages: 480, fiction: false, series: "", notes: "" },
  { id: 83, title: "The Selfish Gene", author: "Richard Dawkins", year: 2010, genre: "Popular Science", country: "UK", pages: 360, fiction: false, series: "", notes: "" },
  { id: 84, title: "The God Delusion", author: "Richard Dawkins", year: 2010, genre: "Philosophy", country: "UK", pages: 406, fiction: false, series: "", notes: "" },
  { id: 85, title: "Surely You're Joking, Mr. Feynman", author: "Richard Feynman", year: 2010, genre: "Biography", country: "USA", pages: 352, fiction: false, series: "", notes: "" },
  { id: 86, title: "The Pleasure of Finding Things Out", author: "Richard Feynman", year: 2010, genre: "Popular Science", country: "USA", pages: 270, fiction: false, series: "", notes: "" },
  { id: 87, title: "Freakonomics", author: "Steven Levitt & Stephen Dubner", year: 2010, genre: "Economics", country: "USA", pages: 284, fiction: false, series: "", notes: "" },
  { id: 88, title: "I, Cyborg", author: "Kevin Warwick", year: 2010, genre: "Popular Science", country: "UK", pages: 320, fiction: false, series: "", notes: "" },
  { id: 89, title: "Born on a Blue Day", author: "Daniel Tammet", year: 2010, genre: "Biography", country: "UK", pages: 256, fiction: false, series: "", notes: "" },
  { id: 90, title: "The Power of Now", author: "Eckhart Tolle", year: 2010, genre: "Philosophy", country: "Germany", pages: 236, fiction: false, series: "", notes: "" },
  { id: 91, title: "The Story of My Experiments with Truth", author: "Mahatma Gandhi", year: 2010, genre: "Biography", country: "India", pages: 480, fiction: false, series: "", notes: "" },
  { id: 92, title: "Mein Kampf", author: "Adolf Hitler", year: 2010, genre: "History", country: "Germany", pages: 720, fiction: false, series: "", notes: "" },
  { id: 93, title: "The Motorcycle Diaries", author: "Che Guevara", year: 2010, genre: "Biography", country: "Argentina", pages: 175, fiction: false, series: "", notes: "" },
  { id: 94, title: "A Short History of Nearly Everything", author: "Bill Bryson", year: 2010, genre: "Popular Science", country: "USA", pages: 544, fiction: false, series: "", notes: "" },
  { id: 95, title: "The Hobbit", author: "J.R.R. Tolkien", year: 2010, genre: "Fantasy", country: "UK", pages: 310, fiction: true, series: "The Lord of the Rings", notes: "Prequel" },
  { id: 96, title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", year: 2010, genre: "Fantasy", country: "UK", pages: 423, fiction: true, series: "The Lord of the Rings", notes: "Books 2-3 unread" },
  { id: 97, title: "The Da Vinci Code", author: "Dan Brown", year: 2010, genre: "Thriller", country: "USA", pages: 454, fiction: true, series: "Robert Langdon", notes: "" },
  { id: 98, title: "Angels and Demons", author: "Dan Brown", year: 2010, genre: "Thriller", country: "USA", pages: 736, fiction: true, series: "Robert Langdon", notes: "" },
  { id: 99, title: "Digital Fortress", author: "Dan Brown", year: 2010, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 100, title: "Deception Point", author: "Dan Brown", year: 2010, genre: "Thriller", country: "USA", pages: 560, fiction: true, series: "", notes: "" },
  { id: 101, title: "The Alchemist", author: "Paulo Coelho", year: 2010, genre: "Literary Fiction", country: "Brazil", pages: 163, fiction: true, series: "", notes: "" },
  { id: 102, title: "Veronika Decides to Die", author: "Paulo Coelho", year: 2010, genre: "Literary Fiction", country: "Brazil", pages: 211, fiction: true, series: "", notes: "" },
  { id: 103, title: "Eleven Minutes", author: "Paulo Coelho", year: 2010, genre: "Literary Fiction", country: "Brazil", pages: 241, fiction: true, series: "", notes: "" },
  { id: 104, title: "The Fountainhead", author: "Ayn Rand", year: 2010, genre: "Literary Fiction", country: "USA", pages: 753, fiction: true, series: "", notes: "Reread every 7-10 years" },
  { id: 105, title: "Atlas Shrugged", author: "Ayn Rand", year: 2010, genre: "Literary Fiction", country: "USA", pages: 1168, fiction: true, series: "", notes: "Reread every 7-10 years" },
  { id: 106, title: "We the Living", author: "Ayn Rand", year: 2010, genre: "Literary Fiction", country: "USA", pages: 433, fiction: true, series: "", notes: "" },
  { id: 107, title: "Anthem", author: "Ayn Rand", year: 2010, genre: "Literary Fiction", country: "USA", pages: 105, fiction: true, series: "", notes: "" },
  { id: 108, title: "Night of January 16th", author: "Ayn Rand", year: 2010, genre: "Literary Fiction", country: "USA", pages: 128, fiction: true, series: "", notes: "" },
  { id: 109, title: "The Unbearable Lightness of Being", author: "Milan Kundera", year: 2010, genre: "Literary Fiction", country: "Czech Republic", pages: 314, fiction: true, series: "", notes: "" },
  { id: 110, title: "Life of Pi", author: "Yann Martel", year: 2010, genre: "Literary Fiction", country: "Canada", pages: 319, fiction: true, series: "", notes: "" },
  { id: 111, title: "The Curious Incident of the Dog in the Night-Time", author: "Mark Haddon", year: 2010, genre: "Literary Fiction", country: "UK", pages: 226, fiction: true, series: "", notes: "" },
  { id: 112, title: "Siddhartha", author: "Hermann Hesse", year: 2010, genre: "Literary Fiction", country: "Germany", pages: 152, fiction: true, series: "", notes: "" },
  { id: 113, title: "God's Debris", author: "Scott Adams", year: 2010, genre: "Philosophy", country: "USA", pages: 132, fiction: true, series: "", notes: "" },
  { id: 114, title: "The Catcher in the Rye", author: "J.D. Salinger", year: 2010, genre: "Literary Fiction", country: "USA", pages: 277, fiction: true, series: "", notes: "" },
  { id: 115, title: "To Kill a Mockingbird", author: "Harper Lee", year: 2010, genre: "Literary Fiction", country: "USA", pages: 281, fiction: true, series: "", notes: "" },
  { id: 116, title: "The Enchantress of Florence", author: "Salman Rushdie", year: 2010, genre: "Literary Fiction", country: "India", pages: 368, fiction: true, series: "", notes: "" },
  { id: 117, title: "1984", author: "George Orwell", year: 2010, genre: "Sci-Fi", country: "UK", pages: 328, fiction: true, series: "", notes: "" },
  { id: 118, title: "Animal Farm", author: "George Orwell", year: 2010, genre: "Sci-Fi", country: "UK", pages: 112, fiction: true, series: "", notes: "" },
  { id: 119, title: "Brave New World", author: "Aldous Huxley", year: 2010, genre: "Sci-Fi", country: "UK", pages: 311, fiction: true, series: "", notes: "" },
  { id: 120, title: "The Mystery of the Whispering Mummy", author: "Robert Arthur", year: 2010, genre: "Mystery", country: "USA", pages: 192, fiction: true, series: "Three Investigators", notes: "" },
  { id: 121, title: "Rendezvous with Rama", author: "Arthur C. Clarke", year: 2010, genre: "Sci-Fi", country: "UK", pages: 256, fiction: true, series: "Rama", notes: "" },
  { id: 122, title: "Rama II", author: "Arthur C. Clarke & Gentry Lee", year: 2010, genre: "Sci-Fi", country: "UK", pages: 480, fiction: true, series: "Rama", notes: "" },
  { id: 123, title: "The Garden of Rama", author: "Arthur C. Clarke & Gentry Lee", year: 2010, genre: "Sci-Fi", country: "UK", pages: 441, fiction: true, series: "Rama", notes: "" },
  { id: 124, title: "Rama Revealed", author: "Arthur C. Clarke & Gentry Lee", year: 2010, genre: "Sci-Fi", country: "UK", pages: 512, fiction: true, series: "Rama", notes: "" },
  { id: 125, title: "2010: Odyssey Two", author: "Arthur C. Clarke", year: 2010, genre: "Sci-Fi", country: "UK", pages: 291, fiction: true, series: "Space Odyssey", notes: "" },
  { id: 126, title: "2061: Odyssey Three", author: "Arthur C. Clarke", year: 2010, genre: "Sci-Fi", country: "UK", pages: 256, fiction: true, series: "Space Odyssey", notes: "" },
  { id: 127, title: "3001: The Final Odyssey", author: "Arthur C. Clarke", year: 2010, genre: "Sci-Fi", country: "UK", pages: 263, fiction: true, series: "Space Odyssey", notes: "" },
  { id: 128, title: "Blindsight", author: "Peter Watts", year: 2010, genre: "Sci-Fi", country: "Canada", pages: 384, fiction: true, series: "Firefall", notes: "" },
  { id: 129, title: "The Afghan", author: "Frederick Forsyth", year: 2010, genre: "Thriller", country: "UK", pages: 416, fiction: true, series: "", notes: "" },
  { id: 130, title: "Childhood's End", author: "Arthur C. Clarke", year: 2010, genre: "Sci-Fi", country: "UK", pages: 224, fiction: true, series: "", notes: "" },
  { id: 131, title: "Like the Flowing River", author: "Paulo Coelho", year: 2011, genre: "Literary Fiction", country: "Brazil", pages: 224, fiction: false, series: "", notes: "" },
  { id: 132, title: "Eragon", author: "Christopher Paolini", year: 2011, genre: "Fantasy", country: "USA", pages: 503, fiction: true, series: "Inheritance Cycle", notes: "" },
  { id: 133, title: "Eldest", author: "Christopher Paolini", year: 2011, genre: "Fantasy", country: "USA", pages: 668, fiction: true, series: "Inheritance Cycle", notes: "" },
  { id: 134, title: "Brisingr", author: "Christopher Paolini", year: 2011, genre: "Fantasy", country: "USA", pages: 763, fiction: true, series: "Inheritance Cycle", notes: "" },
  { id: 135, title: "The White Tiger", author: "Aravind Adiga", year: 2011, genre: "Literary Fiction", country: "India", pages: 276, fiction: true, series: "", notes: "" },
  { id: 136, title: "Sea of Poppies", author: "Amitav Ghosh", year: 2011, genre: "Historical Fiction", country: "India", pages: 515, fiction: true, series: "Ibis Trilogy", notes: "" },
  { id: 137, title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", year: 2011, genre: "Fantasy", country: "UK", pages: 223, fiction: true, series: "Harry Potter", notes: "" },
  { id: 138, title: "Lolita", author: "Vladimir Nabokov", year: 2011, genre: "Literary Fiction", country: "Russia", pages: 317, fiction: true, series: "", notes: "" },
  { id: 139, title: "World War Z", author: "Max Brooks", year: 2011, genre: "Thriller", country: "USA", pages: 342, fiction: true, series: "", notes: "" },
  { id: 140, title: "House of Leaves", author: "Mark Z. Danielewski", year: 2011, genre: "Horror", country: "USA", pages: 709, fiction: true, series: "", notes: "" },
  { id: 141, title: "Persepolis", author: "Marjane Satrapi", year: 2011, genre: "Biography", country: "Iran", pages: 341, fiction: false, series: "", notes: "" },
  { id: 142, title: "Maus", author: "Art Spiegelman", year: 2011, genre: "History", country: "USA", pages: 296, fiction: false, series: "Maus", notes: "" },
  { id: 143, title: "Breakfast of Champions", author: "Kurt Vonnegut", year: 2011, genre: "Literary Fiction", country: "USA", pages: 302, fiction: true, series: "", notes: "" },
  { id: 144, title: "The Colour of Magic", author: "Terry Pratchett", year: 2011, genre: "Fantasy", country: "UK", pages: 210, fiction: true, series: "Discworld", notes: "" },
  { id: 145, title: "The Light Fantastic", author: "Terry Pratchett", year: 2011, genre: "Fantasy", country: "UK", pages: 224, fiction: true, series: "Discworld", notes: "" },
  { id: 146, title: "Journey to the Center of the Earth", author: "Jules Verne", year: 2011, genre: "Sci-Fi", country: "France", pages: 224, fiction: true, series: "", notes: "" },
  { id: 147, title: "Gora", author: "Rabindranath Tagore", year: 2011, genre: "Literary Fiction", country: "India", pages: 548, fiction: true, series: "", notes: "" },
  { id: 148, title: "Inheritance", author: "Christopher Paolini", year: 2011, genre: "Fantasy", country: "USA", pages: 849, fiction: true, series: "Inheritance Cycle", notes: "" },
  { id: 149, title: "Elantris", author: "Brandon Sanderson", year: 2011, genre: "Fantasy", country: "USA", pages: 492, fiction: true, series: "Cosmere", notes: "" },
  { id: 150, title: "Vagabonding", author: "Rolf Potts", year: 2011, genre: "Non-Fiction", country: "USA", pages: 224, fiction: false, series: "", notes: "" },
  { id: 151, title: "Anzacs at War", author: "Commando Comics", year: 2011, genre: "Graphic Novel", country: "UK", pages: 64, fiction: false, series: "", notes: "" },
  { id: 152, title: "Mistborn", author: "Brandon Sanderson", year: 2012, genre: "Fantasy", country: "USA", pages: 541, fiction: true, series: "Mistborn Era 1", notes: "" },
  { id: 153, title: "The Well of Ascension", author: "Brandon Sanderson", year: 2012, genre: "Fantasy", country: "USA", pages: 590, fiction: true, series: "Mistborn Era 1", notes: "" },
  { id: 154, title: "The Hero of Ages", author: "Brandon Sanderson", year: 2012, genre: "Fantasy", country: "USA", pages: 572, fiction: true, series: "Mistborn Era 1", notes: "" },
  { id: 155, title: "The Alloy of Law", author: "Brandon Sanderson", year: 2012, genre: "Fantasy", country: "USA", pages: 336, fiction: true, series: "Mistborn Era 2", notes: "" },
  { id: 156, title: "Warbreaker", author: "Brandon Sanderson", year: 2012, genre: "Fantasy", country: "USA", pages: 592, fiction: true, series: "Cosmere", notes: "" },
  { id: 157, title: "The Way of Kings", author: "Brandon Sanderson", year: 2012, genre: "Fantasy", country: "USA", pages: 1007, fiction: true, series: "Stormlight Archive", notes: "" },
  { id: 158, title: "Micro", author: "Michael Crichton", year: 2012, genre: "Thriller", country: "USA", pages: 416, fiction: true, series: "", notes: "Posthumous" },
  { id: 159, title: "Love in the Time of Cholera", author: "Gabriel Garcia Marquez", year: 2012, genre: "Literary Fiction", country: "Colombia", pages: 368, fiction: true, series: "", notes: "" },
  { id: 160, title: "Foundation's Edge", author: "Isaac Asimov", year: 2012, genre: "Sci-Fi", country: "USA", pages: 366, fiction: true, series: "Foundation", notes: "" },
  { id: 161, title: "The Mysterious Flame of Queen Leona", author: "Umberto Eco", year: 2012, genre: "Literary Fiction", country: "Italy", pages: 469, fiction: true, series: "", notes: "" },
  { id: 162, title: "Batman: Year One", author: "Frank Miller", year: 2012, genre: "Graphic Novel", country: "USA", pages: 96, fiction: true, series: "Batman", notes: "" },
  { id: 163, title: "Batman: The Killing Joke", author: "Alan Moore", year: 2012, genre: "Graphic Novel", country: "UK", pages: 64, fiction: true, series: "Batman", notes: "" },
  { id: 164, title: "My Story", author: "Kamala Das", year: 2012, genre: "Biography", country: "India", pages: 213, fiction: false, series: "", notes: "" },
  { id: 165, title: "The Redbreast", author: "Jo Nesbo", year: 2012, genre: "Mystery", country: "Norway", pages: 521, fiction: true, series: "Harry Hole", notes: "" },
  { id: 166, title: "The Story of Philosophy", author: "Will Durant", year: 2013, genre: "Philosophy", country: "USA", pages: 412, fiction: false, series: "", notes: "" },
  { id: 167, title: "The Immortals of Meluha", author: "Amish Tripathi", year: 2013, genre: "Fantasy", country: "India", pages: 412, fiction: true, series: "Shiva Trilogy", notes: "" },
  { id: 168, title: "The Secret of the Nagas", author: "Amish Tripathi", year: 2013, genre: "Fantasy", country: "India", pages: 388, fiction: true, series: "Shiva Trilogy", notes: "" },
  { id: 169, title: "V for Vendetta", author: "Alan Moore & Dave Gibbons", year: 2013, genre: "Sci-Fi", country: "UK", pages: 296, fiction: true, series: "", notes: "" },
  { id: 170, title: "The Oath of the Vayuputras", author: "Amish Tripathi", year: 2013, genre: "Fantasy", country: "India", pages: 450, fiction: true, series: "Shiva Trilogy", notes: "" },
  { id: 171, title: "Upanishads", author: "Patrick Olivelle (trans.)", year: 2013, genre: "Philosophy", country: "India", pages: 320, fiction: false, series: "", notes: "" },
  { id: 172, title: "White Mughals", author: "William Dalrymple", year: 2013, genre: "History", country: "UK", pages: 504, fiction: false, series: "", notes: "" },
  { id: 173, title: "The Lost Symbol", author: "Dan Brown", year: 2013, genre: "Thriller", country: "USA", pages: 509, fiction: true, series: "Robert Langdon", notes: "" },
  { id: 174, title: "The Eye of the World", author: "Robert Jordan", year: 2013, genre: "Fantasy", country: "USA", pages: 782, fiction: true, series: "Wheel of Time", notes: "" },
  { id: 175, title: "Steve Jobs", author: "Walter Isaacson", year: 2013, genre: "Biography", country: "USA", pages: 630, fiction: false, series: "", notes: "" },
  { id: 176, title: "The Great Indian Novel", author: "Shashi Tharoor", year: 2013, genre: "Literary Fiction", country: "India", pages: 424, fiction: true, series: "", notes: "" },
  { id: 177, title: "The Lies of Locke Lamora", author: "Scott Lynch", year: 2013, genre: "Fantasy", country: "USA", pages: 499, fiction: true, series: "Gentleman Bastard", notes: "" },
  { id: 178, title: "The Great Hunt", author: "Robert Jordan", year: 2014, genre: "Fantasy", country: "USA", pages: 681, fiction: true, series: "Wheel of Time", notes: "" },
  { id: 179, title: "Phantoms in the Brain", author: "V.S. Ramachandran", year: 2014, genre: "Popular Science", country: "India", pages: 328, fiction: false, series: "", notes: "" },
  { id: 180, title: "Moonward", author: "Appupen", year: 2014, genre: "Literary Fiction", country: "India", pages: 120, fiction: true, series: "", notes: "" },
  { id: 181, title: "The Itch of the Wooden Splinter", author: "Sumit Kumar", year: 2014, genre: "Literary Fiction", country: "India", pages: 88, fiction: true, series: "", notes: "" },
  { id: 182, title: "Manna", author: "Marshall Brain", year: 2014, genre: "Sci-Fi", country: "USA", pages: 200, fiction: true, series: "", notes: "" },
  { id: 183, title: "You Just Don't Understand", author: "Deborah Tannen", year: 2014, genre: "Psychology", country: "USA", pages: 330, fiction: false, series: "", notes: "" },
  { id: 184, title: "Masters of Doom", author: "David Kushner", year: 2014, genre: "Biography", country: "USA", pages: 335, fiction: false, series: "", notes: "" },
  { id: 185, title: "The Day You Discard Your Body", author: "Marshall Brain", year: 2014, genre: "Popular Science", country: "USA", pages: 60, fiction: false, series: "", notes: "" },
  { id: 186, title: "The Dragon Reborn", author: "Robert Jordan", year: 2014, genre: "Fantasy", country: "USA", pages: 624, fiction: true, series: "Wheel of Time", notes: "" },
  { id: 187, title: "Kushiel's Dart", author: "Jacqueline Carey", year: 2014, genre: "Fantasy", country: "USA", pages: 701, fiction: true, series: "Kushiel's Legacy", notes: "" },
  { id: 188, title: "Marker", author: "Robin Cook", year: 2015, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "", notes: "" },
  { id: 189, title: "Paranoid", author: "Joseph Finder", year: 2015, genre: "Thriller", country: "USA", pages: 416, fiction: true, series: "", notes: "" },
  { id: 190, title: "The Kill List", author: "Frederick Forsyth", year: 2015, genre: "Thriller", country: "UK", pages: 352, fiction: true, series: "", notes: "" },
  { id: 191, title: "The Angel Experiment", author: "James Patterson", year: 2015, genre: "Sci-Fi", country: "USA", pages: 440, fiction: true, series: "Maximum Ride", notes: "" },
  { id: 192, title: "The Player of Games", author: "Iain M. Banks", year: 2015, genre: "Sci-Fi", country: "UK", pages: 293, fiction: true, series: "Culture", notes: "" },
  { id: 193, title: "The Atlantis Gene", author: "A.G. Riddle", year: 2015, genre: "Thriller", country: "USA", pages: 432, fiction: true, series: "Origin Mystery", notes: "" },
  { id: 194, title: "The Silver Tower", author: "Matt Fitzgerald", year: 2015, genre: "Thriller", country: "USA", pages: 300, fiction: true, series: "", notes: "" },
  { id: 195, title: "Lonely Planet South East Asia on a Shoestring", author: "Lonely Planet", year: 2015, genre: "Non-Fiction", country: "Australia", pages: 1000, fiction: false, series: "", notes: "" },
  { id: 196, title: "The Martian", author: "Andy Weir", year: 2016, genre: "Sci-Fi", country: "USA", pages: 369, fiction: true, series: "", notes: "" },
  { id: 197, title: "Words of Radiance", author: "Brandon Sanderson", year: 2016, genre: "Fantasy", country: "USA", pages: 1087, fiction: true, series: "Stormlight Archive", notes: "" },
  { id: 198, title: "Shadows of Self", author: "Brandon Sanderson", year: 2016, genre: "Fantasy", country: "USA", pages: 383, fiction: true, series: "Mistborn Era 2", notes: "" },
  { id: 199, title: "The Emperor's Soul", author: "Brandon Sanderson", year: 2016, genre: "Fantasy", country: "USA", pages: 175, fiction: true, series: "Cosmere", notes: "" },
  { id: 200, title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling", year: 2016, genre: "Fantasy", country: "UK", pages: 251, fiction: true, series: "Harry Potter", notes: "" },
  { id: 201, title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling", year: 2016, genre: "Fantasy", country: "UK", pages: 317, fiction: true, series: "Harry Potter", notes: "" },
  { id: 202, title: "Harry Potter and the Goblet of Fire", author: "J.K. Rowling", year: 2016, genre: "Fantasy", country: "UK", pages: 636, fiction: true, series: "Harry Potter", notes: "" },
  { id: 203, title: "Harry Potter and the Order of the Phoenix", author: "J.K. Rowling", year: 2016, genre: "Fantasy", country: "UK", pages: 766, fiction: true, series: "Harry Potter", notes: "" },
  { id: 204, title: "Harry Potter and the Half-Blood Prince", author: "J.K. Rowling", year: 2016, genre: "Fantasy", country: "UK", pages: 607, fiction: true, series: "Harry Potter", notes: "" },
  { id: 205, title: "Harry Potter and the Deathly Hallows", author: "J.K. Rowling", year: 2016, genre: "Fantasy", country: "UK", pages: 607, fiction: true, series: "Harry Potter", notes: "" },
  { id: 206, title: "Inferno", author: "Dan Brown", year: 2016, genre: "Thriller", country: "USA", pages: 480, fiction: true, series: "Robert Langdon", notes: "" },
  { id: 207, title: "A Thousand Splendid Suns", author: "Khaled Hosseini", year: 2016, genre: "Literary Fiction", country: "Afghanistan", pages: 372, fiction: true, series: "", notes: "" },
  { id: 208, title: "Cradle and All", author: "James Patterson", year: 2017, genre: "Thriller", country: "USA", pages: 320, fiction: true, series: "", notes: "" },
  { id: 209, title: "Step on a Crack", author: "James Patterson", year: 2017, genre: "Thriller", country: "USA", pages: 384, fiction: true, series: "Michael Bennett", notes: "" },
  { id: 210, title: "The Vital Question", author: "Nick Lane", year: 2017, genre: "Popular Science", country: "UK", pages: 360, fiction: false, series: "", notes: "" },
  { id: 211, title: "Scion of Ishvaku", author: "Amish Tripathi", year: 2017, genre: "Fantasy", country: "India", pages: 332, fiction: true, series: "Ram Chandra Series", notes: "" },
  { id: 212, title: "Revelation Space", author: "Alastair Reynolds", year: 2017, genre: "Sci-Fi", country: "UK", pages: 585, fiction: true, series: "Revelation Space", notes: "" },
  { id: 213, title: "Gone Girl", author: "Gillian Flynn", year: 2017, genre: "Thriller", country: "USA", pages: 422, fiction: true, series: "", notes: "" },
  { id: 214, title: "Fahrenheit 451", author: "Ray Bradbury", year: 2017, genre: "Sci-Fi", country: "USA", pages: 256, fiction: true, series: "", notes: "" },
  { id: 215, title: "Mahabharata", author: "Amar Chitra Katha", year: 2017, genre: "Historical Fiction", country: "India", pages: 400, fiction: true, series: "", notes: "" },
  { id: 216, title: "Swami and Friends", author: "R.K. Narayan", year: 2017, genre: "Literary Fiction", country: "India", pages: 230, fiction: true, series: "Malgudi", notes: "" },
  { id: 217, title: "Smoke and Mirrors", author: "Neil Gaiman", year: 2017, genre: "Fantasy", country: "UK", pages: 336, fiction: true, series: "", notes: "" },
  { id: 218, title: "The God of Small Things", author: "Arundhati Roy", year: 2017, genre: "Literary Fiction", country: "India", pages: 321, fiction: true, series: "", notes: "" },
  { id: 219, title: "Murder on the Orient Express", author: "Agatha Christie", year: 2017, genre: "Mystery", country: "UK", pages: 256, fiction: true, series: "Hercule Poirot", notes: "" },
  { id: 220, title: "And Then There Were None", author: "Agatha Christie", year: 2017, genre: "Mystery", country: "UK", pages: 264, fiction: true, series: "", notes: "" },
  { id: 221, title: "Sixth of the Dusk", author: "Brandon Sanderson", year: 2017, genre: "Fantasy", country: "USA", pages: 60, fiction: true, series: "Cosmere", notes: "" },
  { id: 222, title: "Endless Night", author: "Agatha Christie", year: 2018, genre: "Mystery", country: "UK", pages: 224, fiction: true, series: "", notes: "" },
  { id: 223, title: "The Murder of Roger Ackroyd", author: "Agatha Christie", year: 2018, genre: "Mystery", country: "UK", pages: 288, fiction: true, series: "Hercule Poirot", notes: "" },
  { id: 224, title: "Zero to One", author: "Peter Thiel", year: 2018, genre: "Business", country: "USA", pages: 195, fiction: false, series: "", notes: "" },
  { id: 225, title: "Statistics: A Graphic Guide", author: "Eileen Magnello & Borin Van Loon", year: 2018, genre: "Popular Science", country: "UK", pages: 176, fiction: false, series: "", notes: "" },
  { id: 226, title: "The Emperor of All Maladies", author: "Siddhartha Mukherjee", year: 2018, genre: "Popular Science", country: "India", pages: 571, fiction: false, series: "", notes: "" },
  { id: 227, title: "The Legends of Halahala", author: "Appupen", year: 2018, genre: "Fantasy", country: "India", pages: 136, fiction: true, series: "", notes: "" },
  { id: 228, title: "Seveneves", author: "Neal Stephenson", year: 2018, genre: "Sci-Fi", country: "USA", pages: 880, fiction: true, series: "", notes: "" },
  { id: 229, title: "The Songs of Distant Earth", author: "Arthur C. Clarke", year: 2018, genre: "Sci-Fi", country: "UK", pages: 255, fiction: true, series: "", notes: "" },
  { id: 230, title: "Aspyrus", author: "Appupen", year: 2018, genre: "Literary Fiction", country: "India", pages: 120, fiction: true, series: "", notes: "" },
  { id: 231, title: "Sum", author: "David Eagleman", year: 2018, genre: "Philosophy", country: "USA", pages: 107, fiction: true, series: "", notes: "" },
  { id: 232, title: "Oathbringer", author: "Brandon Sanderson", year: 2018, genre: "Fantasy", country: "USA", pages: 1248, fiction: true, series: "Stormlight Archive", notes: "" },
  { id: 233, title: "Arcanum Unbounded", author: "Brandon Sanderson", year: 2018, genre: "Fantasy", country: "USA", pages: 672, fiction: true, series: "Cosmere", notes: "" },
  { id: 234, title: "Enlightenment Now", author: "Steven Pinker", year: 2018, genre: "History", country: "Canada", pages: 453, fiction: false, series: "", notes: "" },
  { id: 235, title: "The Fox", author: "Frederick Forsyth", year: 2018, genre: "Thriller", country: "UK", pages: 272, fiction: true, series: "", notes: "" },
  { id: 236, title: "Elon Musk", author: "Ashlee Vance", year: 2018, genre: "Biography", country: "USA", pages: 392, fiction: false, series: "", notes: "" },
  { id: 237, title: "Origin", author: "Dan Brown", year: 2018, genre: "Thriller", country: "USA", pages: 461, fiction: true, series: "Robert Langdon", notes: "" },
  { id: 238, title: "The Hidden Life of Trees", author: "Peter Wohlleben", year: 2018, genre: "Popular Science", country: "Germany", pages: 288, fiction: false, series: "", notes: "" },
  { id: 239, title: "Cathedral", author: "Raymond Carver", year: 2018, genre: "Literary Fiction", country: "USA", pages: 228, fiction: true, series: "", notes: "" },
  { id: 240, title: "Sita", author: "Amish Tripathi", year: 2018, genre: "Fantasy", country: "India", pages: 352, fiction: true, series: "Ram Chandra Series", notes: "" },
  { id: 241, title: "The Guernsey Literary and Potato Peel Pie Society", author: "Mary Ann Shaffer & Annie Barrows", year: 2019, genre: "Literary Fiction", country: "USA", pages: 274, fiction: true, series: "", notes: "" },
  { id: 242, title: "When Breath Becomes Air", author: "Paul Kalanithi", year: 2019, genre: "Biography", country: "USA", pages: 228, fiction: false, series: "", notes: "" },
  { id: 243, title: "Marvel 1602", author: "Neil Gaiman", year: 2019, genre: "Graphic Novel", country: "UK", pages: 248, fiction: true, series: "", notes: "" },
  { id: 244, title: "DC Universe Rebirth", author: "Geoff Johns", year: 2019, genre: "Graphic Novel", country: "USA", pages: 80, fiction: true, series: "", notes: "" },
  { id: 245, title: "All the Names They Used for God", author: "Anjali Sachdeva", year: 2019, genre: "Literary Fiction", country: "India", pages: 224, fiction: true, series: "", notes: "" },
  { id: 246, title: "The Pillars of the Earth", author: "Ken Follett", year: 2019, genre: "Historical Fiction", country: "UK", pages: 973, fiction: true, series: "Kingsbridge", notes: "" },
  { id: 247, title: "World Without End", author: "Ken Follett", year: 2019, genre: "Historical Fiction", country: "UK", pages: 1014, fiction: true, series: "Kingsbridge", notes: "" },
  { id: 248, title: "The Sirens of Titan", author: "Kurt Vonnegut", year: 2019, genre: "Sci-Fi", country: "USA", pages: 326, fiction: true, series: "", notes: "" },
  { id: 249, title: "A Column of Fire", author: "Ken Follett", year: 2019, genre: "Historical Fiction", country: "UK", pages: 916, fiction: true, series: "Kingsbridge", notes: "" },
  { id: 250, title: "How to Win an Indian Election", author: "Shivam Shankar Singh", year: 2019, genre: "Politics", country: "India", pages: 272, fiction: false, series: "", notes: "" },
  { id: 251, title: "Em and the Big Hoom", author: "Jerry Pinto", year: 2019, genre: "Literary Fiction", country: "India", pages: 243, fiction: true, series: "", notes: "" },
  { id: 252, title: "The Courtesan, the Mahatma & the Italian Brahmin", author: "Manu S. Pillai", year: 2019, genre: "History", country: "India", pages: 352, fiction: false, series: "", notes: "" },
  { id: 253, title: "The Verdict", author: "Prannoy Roy & Dorab Sopariwala", year: 2019, genre: "Politics", country: "India", pages: 368, fiction: false, series: "", notes: "" },
  { id: 254, title: "In Love with the World", author: "Yongey Mingyur Rinpoche", year: 2019, genre: "Philosophy", country: "Nepal", pages: 272, fiction: false, series: "", notes: "" },
  { id: 255, title: "A Fine Balance", author: "Rohinton Mistry", year: 2019, genre: "Literary Fiction", country: "India", pages: 603, fiction: true, series: "", notes: "" },
  { id: 256, title: "The Ministry of Utmost Happiness", author: "Arundhati Roy", year: 2019, genre: "Literary Fiction", country: "India", pages: 449, fiction: true, series: "", notes: "" },
  { id: 257, title: "Alice in Wonderland", author: "Lewis Carroll", year: 2019, genre: "Literary Fiction", country: "UK", pages: 192, fiction: true, series: "", notes: "" },
  { id: 258, title: "Superforecasting", author: "Philip Tetlock & Dan Gardner", year: 2019, genre: "Popular Science", country: "USA", pages: 340, fiction: false, series: "", notes: "" },
  { id: 259, title: "Skyward", author: "Brandon Sanderson", year: 2019, genre: "Sci-Fi", country: "USA", pages: 510, fiction: true, series: "Skyward", notes: "" },
  { id: 260, title: "One Part Woman", author: "Perumal Murugan", year: 2019, genre: "Literary Fiction", country: "India", pages: 229, fiction: true, series: "", notes: "" },
  { id: 261, title: "Gujarat Files: Anatomy of a Cover Up", author: "Rana Ayyub", year: 2019, genre: "Politics", country: "India", pages: 168, fiction: false, series: "", notes: "" },
  { id: 262, title: "I Am a Troll", author: "Swati Chaturvedi", year: 2019, genre: "Politics", country: "India", pages: 244, fiction: false, series: "", notes: "" },
  { id: 263, title: "The Buddha's Non-Sectarian Teachings", author: "S.N. Goenka", year: 2019, genre: "Philosophy", country: "India", pages: 150, fiction: false, series: "", notes: "" },
  { id: 264, title: "The Forty Rules of Love", author: "Elif Shafak", year: 2020, genre: "Literary Fiction", country: "Turkey", pages: 368, fiction: true, series: "", notes: "" },
  { id: 265, title: "Eileen", author: "Ottessa Moshfegh", year: 2020, genre: "Literary Fiction", country: "USA", pages: 260, fiction: true, series: "", notes: "" },
  { id: 266, title: "10 Minutes 38 Seconds in This Strange World", author: "Elif Shafak", year: 2020, genre: "Literary Fiction", country: "Turkey", pages: 326, fiction: true, series: "", notes: "" },
  { id: 267, title: "A Suitable Boy", author: "Vikram Seth", year: 2020, genre: "Literary Fiction", country: "India", pages: 1349, fiction: true, series: "", notes: "" },
  { id: 268, title: "Open", author: "Andre Agassi", year: 2020, genre: "Biography", country: "USA", pages: 385, fiction: false, series: "", notes: "" },
  { id: 269, title: "Cari Mora", author: "Thomas Harris", year: 2020, genre: "Thriller", country: "USA", pages: 288, fiction: true, series: "", notes: "" },
  { id: 270, title: "Einstein: His Life and Universe", author: "Walter Isaacson", year: 2020, genre: "Biography", country: "USA", pages: 551, fiction: false, series: "", notes: "" },
  { id: 271, title: "Leonardo da Vinci", author: "Walter Isaacson", year: 2020, genre: "Biography", country: "USA", pages: 524, fiction: false, series: "", notes: "" },
  { id: 272, title: "Ghalib: A Thousand Desires", author: "Raza Mir", year: 2020, genre: "History", country: "India", pages: 240, fiction: false, series: "", notes: "" },
  { id: 273, title: "The Rise and Fall of the Dinosaurs", author: "Steve Brusatte", year: 2020, genre: "Popular Science", country: "USA", pages: 404, fiction: false, series: "", notes: "" },
  { id: 274, title: "A Gentleman in Moscow", author: "Amor Towles", year: 2020, genre: "Literary Fiction", country: "USA", pages: 462, fiction: true, series: "", notes: "" },
  { id: 275, title: "Ishmael", author: "Daniel Quinn", year: 2020, genre: "Literary Fiction", country: "USA", pages: 263, fiction: true, series: "", notes: "" },
  { id: 276, title: "No One is Too Small to Make a Difference", author: "Greta Thunberg", year: 2020, genre: "Politics", country: "Sweden", pages: 128, fiction: false, series: "", notes: "" },
  { id: 277, title: "The Ivory Throne", author: "Manu S. Pillai", year: 2020, genre: "History", country: "India", pages: 612, fiction: false, series: "", notes: "" },
  { id: 278, title: "Born a Crime", author: "Trevor Noah", year: 2020, genre: "Biography", country: "South Africa", pages: 304, fiction: false, series: "", notes: "" },
  { id: 279, title: "An Astronaut's Guide to Life on Earth", author: "Chris Hadfield", year: 2020, genre: "Biography", country: "Canada", pages: 304, fiction: false, series: "", notes: "" },
  { id: 280, title: "I Am Malala", author: "Malala Yousafzai", year: 2020, genre: "Biography", country: "Pakistan", pages: 327, fiction: false, series: "", notes: "" },
  { id: 281, title: "Buddha Vol. 1-8", author: "Osamu Tezuka", year: 2020, genre: "History", country: "Japan", pages: 2400, fiction: true, series: "", notes: "8 volumes combined" },
  { id: 282, title: "The Shape of Ideas", author: "Grant Snider", year: 2020, genre: "Non-Fiction", country: "USA", pages: 192, fiction: false, series: "", notes: "" },
  { id: 283, title: "The Audacity of Hope", author: "Barack Obama", year: 2020, genre: "Politics", country: "USA", pages: 375, fiction: false, series: "", notes: "" },
  { id: 284, title: "Circe", author: "Madeline Miller", year: 2020, genre: "Fantasy", country: "USA", pages: 393, fiction: true, series: "", notes: "" },
  { id: 285, title: "Becoming", author: "Michelle Obama", year: 2020, genre: "Biography", country: "USA", pages: 448, fiction: false, series: "", notes: "" },
  { id: 286, title: "I Will Judge You by Your Bookshelf", author: "Grant Snider", year: 2020, genre: "Non-Fiction", country: "USA", pages: 128, fiction: false, series: "", notes: "" },
  { id: 287, title: "A Promised Land", author: "Barack Obama", year: 2020, genre: "Biography", country: "USA", pages: 701, fiction: false, series: "", notes: "" },
  { id: 288, title: "Macbeth", author: "Shakespeare & Matt Wiegle", year: 2021, genre: "Literary Fiction", country: "UK", pages: 176, fiction: true, series: "", notes: "" },
  { id: 289, title: "To Sleep in a Sea of Stars", author: "Christopher Paolini", year: 2021, genre: "Sci-Fi", country: "USA", pages: 880, fiction: true, series: "", notes: "" },
  { id: 290, title: "Caste", author: "Isabel Wilkerson", year: 2021, genre: "History", country: "USA", pages: 496, fiction: false, series: "", notes: "" },
  { id: 291, title: "The Evening and the Morning", author: "Ken Follett", year: 2021, genre: "Historical Fiction", country: "UK", pages: 850, fiction: true, series: "Kingsbridge", notes: "Prequel" },
  { id: 292, title: "Sapiens", author: "Yuval Noah Harari", year: 2021, genre: "History", country: "Israel", pages: 443, fiction: false, series: "", notes: "" },
  { id: 293, title: "Homo Deus", author: "Yuval Noah Harari", year: 2021, genre: "History", country: "Israel", pages: 450, fiction: false, series: "", notes: "" },
  { id: 294, title: "How Not to Be Wrong", author: "Jordan Ellenberg", year: 2021, genre: "Popular Science", country: "USA", pages: 468, fiction: false, series: "", notes: "" },
  { id: 295, title: "Atomic Habits", author: "James Clear", year: 2021, genre: "Self-Help", country: "USA", pages: 320, fiction: false, series: "", notes: "" },
  { id: 296, title: "Fall of Giants", author: "Ken Follett", year: 2021, genre: "Historical Fiction", country: "UK", pages: 985, fiction: true, series: "Century Trilogy", notes: "" },
  { id: 297, title: "21 Lessons for the 21st Century", author: "Yuval Noah Harari", year: 2021, genre: "History", country: "Israel", pages: 352, fiction: false, series: "", notes: "" },
  { id: 298, title: "Romeo and Juliet", author: "Shakespeare & Matt Wiegle", year: 2021, genre: "Literary Fiction", country: "UK", pages: 176, fiction: true, series: "", notes: "" },
  { id: 299, title: "The Cock is the Culprit", author: "Unni R.", year: 2021, genre: "Literary Fiction", country: "India", pages: 200, fiction: true, series: "", notes: "" },
  { id: 300, title: "An Era of Darkness", author: "Shashi Tharoor", year: 2021, genre: "History", country: "India", pages: 384, fiction: false, series: "", notes: "" },
  { id: 301, title: "A Tiger for Malgudi", author: "R.K. Narayan", year: 2021, genre: "Literary Fiction", country: "India", pages: 222, fiction: true, series: "Malgudi", notes: "" },
  { id: 302, title: "How to Avoid a Climate Disaster", author: "Bill Gates", year: 2021, genre: "Popular Science", country: "USA", pages: 272, fiction: false, series: "", notes: "" },
  { id: 303, title: "The Reluctant Fundamentalist", author: "Mohsin Hamid", year: 2021, genre: "Literary Fiction", country: "Pakistan", pages: 184, fiction: true, series: "", notes: "" },
  { id: 304, title: "Train to Pakistan", author: "Khushwant Singh", year: 2021, genre: "Literary Fiction", country: "India", pages: 192, fiction: true, series: "", notes: "" },
  { id: 305, title: "The Spy and the Traitor", author: "Ben Macintyre", year: 2021, genre: "History", country: "UK", pages: 368, fiction: false, series: "", notes: "" },
  { id: 306, title: "Yuganta", author: "Irawati Karve", year: 2021, genre: "History", country: "India", pages: 208, fiction: false, series: "", notes: "" },
  { id: 307, title: "Crime and Punishment", author: "Fyodor Dostoevsky", year: 2021, genre: "Literary Fiction", country: "Russia", pages: 545, fiction: true, series: "", notes: "" },
  { id: 308, title: "Meditations", author: "Marcus Aurelius", year: 2021, genre: "Philosophy", country: "Rome", pages: 256, fiction: false, series: "", notes: "" },
  { id: 309, title: "Midnight's Children", author: "Salman Rushdie", year: 2021, genre: "Literary Fiction", country: "India", pages: 647, fiction: true, series: "", notes: "" },
  { id: 310, title: "Born to Run", author: "Christopher McDougall", year: 2021, genre: "Biography", country: "USA", pages: 287, fiction: false, series: "", notes: "" },
  { id: 311, title: "Artemis", author: "Andy Weir", year: 2021, genre: "Sci-Fi", country: "USA", pages: 305, fiction: true, series: "", notes: "" },
  { id: 312, title: "Economics in One Lesson", author: "Henry Hazlitt", year: 2021, genre: "Economics", country: "USA", pages: 218, fiction: false, series: "", notes: "" },
  { id: 313, title: "The Name of the Wind", author: "Patrick Rothfuss", year: 2021, genre: "Fantasy", country: "USA", pages: 662, fiction: true, series: "Kingkiller Chronicle", notes: "" },
  { id: 314, title: "Project Hail Mary", author: "Andy Weir", year: 2021, genre: "Sci-Fi", country: "USA", pages: 476, fiction: true, series: "", notes: "" },
  { id: 315, title: "Nudge", author: "Richard Thaler & Cass Sunstein", year: 2021, genre: "Psychology", country: "USA", pages: 293, fiction: false, series: "", notes: "" },
  { id: 316, title: "The Wise Man's Fear", author: "Patrick Rothfuss", year: 2021, genre: "Fantasy", country: "USA", pages: 994, fiction: true, series: "Kingkiller Chronicle", notes: "" },
  { id: 317, title: "Annihilation of Caste", author: "B.R. Ambedkar", year: 2021, genre: "History", country: "India", pages: 264, fiction: false, series: "", notes: "" },
  { id: 318, title: "A Feast of Vultures", author: "Josy Joseph", year: 2021, genre: "Politics", country: "India", pages: 296, fiction: false, series: "", notes: "" },
  { id: 319, title: "The Case for Climate Capitalism", author: "Tom Rand", year: 2021, genre: "Economics", country: "Canada", pages: 256, fiction: false, series: "", notes: "" },
  { id: 320, title: "In Service of the Republic", author: "Vijay Kelkar & Ajay Shah", year: 2021, genre: "Economics", country: "India", pages: 320, fiction: false, series: "", notes: "" },
  { id: 321, title: "Silent Spring", author: "Rachel Carson", year: 2021, genre: "Popular Science", country: "USA", pages: 368, fiction: false, series: "", notes: "" },
  { id: 322, title: "Thinking, Fast and Slow", author: "Daniel Kahneman", year: 2021, genre: "Psychology", country: "Israel", pages: 499, fiction: false, series: "", notes: "" },
  { id: 323, title: "The Notebook, The Proof, The Third Lie", author: "Agota Kristof", year: 2021, genre: "Literary Fiction", country: "Hungary", pages: 512, fiction: true, series: "The Claus Trilogy", notes: "Combined edition" },
  { id: 324, title: "Good Economics for Hard Times", author: "Abhijit Banerjee & Esther Duflo", year: 2021, genre: "Economics", country: "India", pages: 432, fiction: false, series: "", notes: "" },
  { id: 325, title: "Poonachi", author: "Perumal Murugan", year: 2021, genre: "Literary Fiction", country: "India", pages: 157, fiction: true, series: "", notes: "" },
  { id: 326, title: "This Changes Everything", author: "Naomi Klein", year: 2021, genre: "Politics", country: "Canada", pages: 576, fiction: false, series: "", notes: "" },
  { id: 327, title: "The Five Love Languages", author: "Gary Chapman", year: 2021, genre: "Self-Help", country: "USA", pages: 208, fiction: false, series: "", notes: "" },
  { id: 328, title: "Child 44", author: "Tom Rob Smith", year: 2022, genre: "Thriller", country: "UK", pages: 439, fiction: true, series: "Leo Demidov", notes: "" },
  { id: 329, title: "Starsight", author: "Brandon Sanderson", year: 2022, genre: "Sci-Fi", country: "USA", pages: 461, fiction: true, series: "Skyward", notes: "" },
  { id: 330, title: "Thinking in Systems", author: "Donella Meadows", year: 2022, genre: "Popular Science", country: "USA", pages: 218, fiction: false, series: "", notes: "" },
  { id: 331, title: "A Court of Thorns and Roses", author: "Sarah J. Maas", year: 2025, genre: "Fantasy", country: "USA", pages: 419, fiction: true, series: "ACOTAR", notes: "" },
  { id: 332, title: "Dawnshard", author: "Brandon Sanderson", year: 2025, genre: "Fantasy", country: "USA", pages: 176, fiction: true, series: "Stormlight Archive", notes: "" },
  { id: 333, title: "Secret of Secrets", author: "Dan Brown", year: 2025, genre: "Thriller", country: "USA", pages: 400, fiction: true, series: "Robert Langdon", notes: "" },
  { id: 334, title: "Heart Lamp", author: "Banu Mushtaq", year: 2025, genre: "Literary Fiction", country: "India", pages: 192, fiction: true, series: "", notes: "Translated from Kannada; JCB Prize winner" },
  { id: 335, title: "The Silent Patient", author: "Alex Michaelides", year: 2025, genre: "Thriller", country: "UK", pages: 336, fiction: true, series: "", notes: "" },
  { id: 336, title: "Cinema Speculation", author: "Quentin Tarantino", year: 2025, genre: "Non-Fiction", country: "USA", pages: 392, fiction: false, series: "", notes: "" },
  { id: 337, title: "A Court of Mist and Fury", author: "Sarah J. Maas", year: 2026, genre: "Fantasy", country: "USA", pages: 624, fiction: true, series: "ACOTAR", notes: "" },
  { id: 338, title: "A Court of Wings and Ruin", author: "Sarah J. Maas", year: 2026, genre: "Fantasy", country: "USA", pages: 699, fiction: true, series: "ACOTAR", notes: "" },
  { id: 339, title: "A Court of Frost and Starlight", author: "Sarah J. Maas", year: 2026, genre: "Fantasy", country: "USA", pages: 229, fiction: true, series: "ACOTAR", notes: "" },
  { id: 340, title: "A Court of Silver Flames", author: "Sarah J. Maas", year: 2026, genre: "Fantasy", country: "USA", pages: 757, fiction: true, series: "ACOTAR", notes: "" },
  { id: 341, title: "Fourth Wing", author: "Rebecca Yarros", year: 2026, genre: "Fantasy", country: "USA", pages: 512, fiction: true, series: "The Empyrean", notes: "" },
  { id: 342, title: "Iron Flame", author: "Rebecca Yarros", year: 2026, genre: "Fantasy", country: "USA", pages: 623, fiction: true, series: "The Empyrean", notes: "" },
  { id: 343, title: "Onyx Storm", author: "Rebecca Yarros", year: 2026, genre: "Fantasy", country: "USA", pages: 687, fiction: true, series: "The Empyrean", notes: "" },
  { id: 344, title: "Tress of the Emerald Sea", author: "Brandon Sanderson", year: 2026, genre: "Fantasy", country: "USA", pages: 370, fiction: true, series: "Cosmere", notes: "" },
  { id: 345, title: "Yumi and the Nightmare Painter", author: "Brandon Sanderson", year: 2026, genre: "Fantasy", country: "USA", pages: 480, fiction: true, series: "Cosmere", notes: "" },
];

const READING_CONTEXT = `This reader has consumed 345 books across 17 years (2010–2026). Key patterns:

TOP AUTHORS: Brandon Sanderson (many books – Mistborn, Stormlight Archive, Skyward, Cosmere novellas), Sidney Sheldon (thrillers), Sarah J. Maas (ACOTAR series), Rebecca Yarros (Empyrean series), J.K. Rowling (Harry Potter), Christopher Paolini (Eragon), Ken Follett (Kingsbridge), Agatha Christie (mysteries), Amish Tripathi (Indian mythology fantasy), Robert Jordan (Wheel of Time), Dan Brown (thrillers), Andy Weir (sci-fi), Walter Isaacson (biographies), Yuval Noah Harari (non-fiction), Perumal Murugan (Indian literary), Arundhati Roy (Indian literary), Appupen (Indian graphic novels).

GENRES (ranked): Thriller (~83 books) > Literary Fiction (~55) > Fantasy (~54) > Sci-Fi (~47) > Biography (~19) > Popular Science (~17) > History (~17) > Philosophy (~9) > Politics (~8) > Historical Fiction (~8) > Mystery (~6) > Economics (~5) > Graphic Novel (~5) > Non-Fiction (~5) > Psychology (~3) > Self-Help (~2) > Horror (~1) > Business (~1).

YEAR HIGHLIGHTS: 2010 (heavy reading – 130 books, likely early reading list), 2011-2014 (fantasy exploration), 2015-2017 (diverse non-fiction phase), 2018-19 (literary fiction surge), 2020-21 (pandemic reading peak – 24+40 books), 2022 (sudden drop to 3), 2023-24 (hiatus), 2025-26 (comeback with romantasy – ACOTAR + Empyrean).

STRONG INTERESTS: Thrillers and crime fiction, epic fantasy, Indian literature, science non-fiction, literary fiction, biographies of scientists/leaders, graphic novels, history and politics.

POTENTIAL GAPS: Literary romance, poetry, westerns, African literature, Japanese fiction beyond manga, Latin American magical realism beyond Marquez, contemporary cozy mysteries, Nordic noir beyond Nesbo.

RECENT DIRECTION (2025-26): Clear romantasy and fantasy phase – ACOTAR series, Empyrean series, Cosmere. Also some literary fiction. Suggests appetite for character-driven fantasy with romance, not just plot-heavy epic fantasy.`;

// ── MULTI SELECT ─────────────────────────────────────────────────────────
function MultiSelect({ options, selected, onChange, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: G.card2, border: `1px solid ${open ? G.goldDim : G.border}`, borderRadius: 8, color: selected.length ? G.text : G.muted, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, userSelect: "none", transition: "border-color 0.2s" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{label}</span>
        <span style={{ color: G.muted, fontSize: 10, flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, zIndex: 200, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          {selected.length > 0 && (
            <div onClick={() => onChange([])} style={{ padding: "8px 14px", fontSize: 11, color: G.gold, cursor: "pointer", borderBottom: `1px solid ${G.border}` }}>✕ Clear all</div>
          )}
          {options.map(o => (
            <div key={o} onClick={() => toggle(o)} style={{ padding: "8px 14px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: selected.includes(o) ? G.text : G.muted, background: selected.includes(o) ? `${G.gold}10` : "transparent" }}>
              <div style={{ width: 14, height: 14, border: `1px solid ${selected.includes(o) ? G.gold : G.border}`, borderRadius: 3, background: selected.includes(o) ? G.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: "#000", fontWeight: 700 }}>
                {selected.includes(o) && "✓"}
              </div>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RANGE FILTER ─────────────────────────────────────────────────────────
function RangeFilter({ chartId, allYears, ranges, onSet }) {
  if (!allYears || allYears.length === 0) return null;
  const r = ranges[chartId] || { from: allYears[0], to: allYears[allYears.length - 1] };
  const sel = { background: G.card2, border: `1px solid ${G.border}`, borderRadius: 4, color: G.muted, fontSize: 10, padding: "2px 4px", outline: "none", cursor: "pointer" };
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <span style={{ color: G.dimmed, fontSize: 10 }}>From</span>
      <select style={sel} value={r.from} onChange={e => onSet(chartId, Number(e.target.value), r.to)}>
        {allYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <span style={{ color: G.dimmed, fontSize: 10 }}>to</span>
      <select style={sel} value={r.to} onChange={e => onSet(chartId, r.from, Number(e.target.value))}>
        {allYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

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
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem("nairrative_books");
      return saved ? JSON.parse(saved) : INITIAL_BOOKS;
    } catch { return INITIAL_BOOKS; }
  });
  const [search, setSearch] = useState("");
  const [libGenres, setLibGenres] = useState([]);
  const [libYears, setLibYears] = useState([]);
  const [libAuthors, setLibAuthors] = useState([]);
  const [libSort, setLibSort] = useState("year");
  const [chartRanges, setChartRanges] = useState({});
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I know your complete reading history — 345 books across 17 years. Ask me anything: your patterns, what to read next, your top authors, surprising stats, or anything else!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisChat, setAnalysisChat] = useState([]);
  const [analysisChatInput, setAnalysisChatInput] = useState("");
  const [analysisChatLoading, setAnalysisChatLoading] = useState(false);
  const [intentInputs, setIntentInputs] = useState({});
  const [intentResults, setIntentResults] = useState({});
  const [intentLoading, setIntentLoading] = useState({});
  const [newBook, setNewBook] = useState({ title: "", author: "", year: 2026, genre: "Fantasy", country: "", pages: "" });
  const [addMsg, setAddMsg] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
  const [seriesRecap, setSeriesRecap] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("");
  const chatEndRef = useRef(null);
  const nextId = useRef(parseInt(localStorage.getItem("nairrative_next_id") || "346"));

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;600&family=Lora:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,wght@0,300;1,300&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    localStorage.setItem("nairrative_books", JSON.stringify(books));
    localStorage.setItem("nairrative_next_id", String(nextId.current));
  }, [books]);

  const AUTO_RECS = ["more-like", "more-by-last", "similar-author", "trending", "challenge", "quick", "gaps", "surprise", "finish"];

  const INPUT_DEFAULTS = {
    "loved": ["Dune", "The Name of the Wind", "The White Tiger", "Gone Girl", "Foundation", "The Remains of the Day"],
    "authors-like": ["Brandon Sanderson", "Agatha Christie", "Yuval Noah Harari", "Arundhati Roy", "Michael Crichton", "Neil Gaiman"],
    "mood": ["dark and atmospheric", "light and funny", "epic and sweeping", "thought-provoking non-fiction", "cozy and comforting", "fast-paced thriller"],
    "genre-pick": Object.keys(GENRE_COLORS),
    "topic": ["artificial intelligence", "Indian history", "climate and environment", "espionage", "philosophy of mind", "exploration and adventure"],
    "occasion": ["a long flight", "book club", "summer reading", "a lazy weekend", "gift for a friend who loves thrillers", "something to read before bed"],
    "pair": ["Oppenheimer (film)", "Shogun (TV series)", "a trip to Japan", "watching the World Cup", "Interstellar (film)", "reading about WW2"],
  };

  useEffect(() => {
    if (activeTab !== "recs") return;
    // Auto panels
    AUTO_RECS.forEach(id => { if (!intentResults[id] && !intentLoading[id]) fetchIntentRecs(id); });
    // Input panels — set random defaults and fetch if not already done
    Object.entries(INPUT_DEFAULTS).forEach(([id, options]) => {
      if (!intentResults[id] && !intentLoading[id]) {
        const pick = options[Math.floor(Math.random() * options.length)];
        setIntentInputs(p => ({ ...p, [id]: p[id] || pick }));
        setTimeout(() => fetchIntentRecs(id, pick), 100);
      }
    });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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


  const analysisInsights = useMemo(() => {
    const fGen = new Set(["Fantasy","Sci-Fi","Thriller","Mystery","Literary Fiction","Historical Fiction","Classic","Horror"]);

    // Temporal
    const years = Object.keys(stats.byYear).map(Number).sort();
    const fullRange = Array.from({length: years[years.length-1] - years[0] + 1}, (_, i) => years[0] + i);
    const avgPerActive = Math.round(books.length / years.length);
    let maxGap = 0, curGap = 0, gapStart = null, longestGapStart = null;
    for (const y of fullRange) {
      if (!stats.byYear[y]) { if (!curGap) gapStart = y; curGap++; if (curGap > maxGap) { maxGap = curGap; longestGapStart = gapStart; } }
      else curGap = 0;
    }

    // Genre & Form
    const fictionCount = books.filter(b => b.fiction !== undefined ? b.fiction : fGen.has(b.genre)).length;
    const fictionPct = Math.round(fictionCount / books.length * 100);
    const graphicNovels = books.filter(b => b.genre === "Graphic Novel").length;
    const genreCount = Object.keys(stats.byGenre).length;
    const era = (s, e) => books.filter(b => b.year >= s && b.year <= e);
    const topGenreIn = sub => Object.entries(sub.reduce((a, b) => { a[b.genre]=(a[b.genre]||0)+1; return a; }, {})).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";
    const genreEra = [
      { era: "2010–14", top: topGenreIn(era(2010,2014)) },
      { era: "2015–19", top: topGenreIn(era(2015,2019)) },
      { era: "2020–24", top: topGenreIn(era(2020,2024)) },
      { era: "2025–26", top: topGenreIn(era(2025,2026)) },
    ];

    // Geographic
    const uniqueCountries = Object.keys(stats.byCountry).length;
    const topCountries = Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const indiaPct = Math.round((stats.byCountry["India"]||0) / books.length * 100);

    // Author behavior
    const authorEntries = Object.entries(stats.byAuthor);
    const loyal = authorEntries.filter(([,c])=>c>=5).sort((a,b)=>b[1]-a[1]);
    const sampledCount = authorEntries.filter(([,c])=>c===1).length;
    const booksFromLoyal = loyal.reduce((s,[,c])=>s+c,0);
    const loyaltyRatio = Math.round(booksFromLoyal / books.length * 100);

    // Complexity
    const challengingAuthors = new Set(["Fyodor Dostoevsky","Vladimir Nabokov","Mark Z. Danielewski","Kurt Vonnegut","Salman Rushdie","Umberto Eco","Agota Kristof","Marcus Aurelius","B.R. Ambedkar","Irawati Karve","Arundhati Roy","Perumal Murugan"]);
    const challengingCount = books.filter(b => challengingAuthors.has(b.author) || b.genre === "Classic" || b.genre === "Philosophy").length;
    const challengePct = Math.round(challengingCount / books.length * 100);

    // Series estimation
    const knownSeriesAuthors = new Set(["Brandon Sanderson","J.K. Rowling","Christopher Paolini","Ken Follett","Robert Jordan","Sarah J. Maas","Rebecca Yarros","Amish Tripathi","Agatha Christie"]);
    const seriesCount = books.filter(b => knownSeriesAuthors.has(b.author)).length;
    const seriesPct = Math.round(seriesCount / books.length * 100);

    // Emotional arc: fiction % by era
    const eraFictionPct = (s, e) => { const sub = era(s,e); return sub.length ? Math.round(sub.filter(b=>b.fiction !== undefined ? b.fiction : fGen.has(b.genre)).length/sub.length*100) : 0; };
    const fictionByEra = [
      { era: "2010–14", pct: eraFictionPct(2010,2014) },
      { era: "2015–19", pct: eraFictionPct(2015,2019) },
      { era: "2020–21", pct: eraFictionPct(2020,2021) },
      { era: "2025–26", pct: eraFictionPct(2025,2026) },
    ];

    return {
      peakYear: stats.sortedYears[0], avgPerActive, maxGap, longestGapStart,
      fictionCount, nonFictionCount: books.length - fictionCount, fictionPct, graphicNovels, genreCount, genreEra,
      uniqueCountries, topCountries, indiaPct,
      loyal, sampledCount, booksFromLoyal, loyaltyRatio,
      challengingCount, challengePct,
      seriesCount, seriesPct,
      fictionByEra,
    };
  }, [books, stats]);

  const filteredBooks = useMemo(() =>
    books.filter(b => {
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false;
      if (libGenres.length > 0 && !libGenres.includes(b.genre)) return false;
      if (libYears.length > 0 && !libYears.includes(String(b.year))) return false;
      if (libAuthors.length > 0 && !libAuthors.includes(b.author)) return false;
      return true;
    }).sort((a, b) => {
      if (libSort === "year") return b.year - a.year;
      if (libSort === "title") return a.title.localeCompare(b.title);
      if (libSort === "author") return a.author.localeCompare(b.author);
      return 0;
    }), [books, search, libGenres, libYears, libAuthors, libSort]);

  const allGenres = useMemo(() => Object.keys(GENRE_COLORS), []);
  const allYears = useMemo(() => Object.keys(stats.byYear).sort().reverse(), [stats]);
  const allAuthors = useMemo(() => [...new Set(books.map(b => b.author))].sort(), [books]);
  const allYearsList = useMemo(() => Object.keys(stats.byYear).sort().map(Number), [stats]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const aiHeaders = () => ({
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  });

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          system: `You are a witty, insightful personal reading assistant. Here is the user's complete reading history:\n\n${READING_CONTEXT}\n\nAnswer questions about their reading habits with specific details, surprising insights, and genuine personality. Be conversational and direct.`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || data.error?.message || "Sorry, try again." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]); }
    finally { setChatLoading(false); }
  };

  const sendAnalysisChat = async () => {
    if (!analysisChatInput.trim() || analysisChatLoading) return;
    const userMsg = { role: "user", content: analysisChatInput };
    const updated = [...analysisChat, userMsg];
    setAnalysisChat(updated);
    setAnalysisChatInput("");
    setAnalysisChatLoading(true);
    try {
      const bookList = books.map(b => `${b.title} by ${b.author} (${b.year}, ${b.genre}${b.pages ? ", " + b.pages + "pp" : ""})`).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1200,
          system: `You are a sharp, data-driven reading analyst. You have access to the user's complete reading list of ${books.length} books:\n\n${bookList}\n\nAnswer analytical questions about their reading patterns, habits, and data with specific numbers, percentages, and examples from the actual list. Be precise and insightful.`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setAnalysisChat(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || data.error?.message || "Sorry, try again." }]);
    } catch { setAnalysisChat(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]); }
    finally { setAnalysisChatLoading(false); }
  };

  const getChartRange = (id) => {
    const timeCharts = new Set(["yc", "fn", "ge"]);
    const defaultFrom = timeCharts.has(id) ? 2011 : (allYearsList[0] ?? 2010);
    return {
      from: chartRanges[id]?.from ?? defaultFrom,
      to: chartRanges[id]?.to ?? allYearsList[allYearsList.length - 1] ?? 2026,
    };
  };
  const setChartRange = (id, from, to) => setChartRanges(p => ({ ...p, [id]: { from, to } }));

  const autoFillBookDetails = async () => {
    if (!newBook.title.trim() || !newBook.author.trim()) { setAddMsg("Enter title and author first."); return; }
    setAutoFilling(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 200,
          system: `You are a book database. Given a book title and author, return ONLY valid JSON (no markdown) with: genre (one of: Fantasy, Sci-Fi, Thriller, Mystery, Literary Fiction, Historical Fiction, Non-Fiction, Graphic Novel, Memoir, Biography, Classic, Philosophy, Science, Self-Help, Travel, Horror, History), country (author's country of birth/nationality), year (original publication year as number), pages (approximate page count as number).`,
          messages: [{ role: "user", content: `Book: "${newBook.title}" by ${newBook.author}` }]
        })
      });
      const data = await res.json();
      const txt = data.content?.[0]?.text || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setNewBook(p => ({ ...p, genre: parsed.genre || p.genre, country: parsed.country || p.country, year: parsed.year || p.year, pages: parsed.pages ? String(parsed.pages) : p.pages }));
      setAddMsg("✓ Details auto-filled! Review and adjust if needed.");
    } catch { setAddMsg("Could not auto-fill. Please enter details manually."); }
    setAutoFilling(false);
    setTimeout(() => setAddMsg(""), 5000);
  };

  const generateSeriesRecap = async (seriesName) => {
    if (!seriesName || seriesLoading) return;
    setSeriesLoading(true);
    setSeriesRecap(null);
    const seriesBooks = books.filter(b => b.series === seriesName).sort((a, b) => (a.id - b.id));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1500,
          system: `You are a knowledgeable literary companion helping a reader catch up on a book series before continuing. Write vivid, engaging recaps — not dry plot summaries, but the kind of catch-up a friend would give you over coffee. Include key characters, major plot turns, how each book ends, and the most important things to remember going into the next book. Keep each book recap to 3–5 sentences.`,
          messages: [{ role: "user", content: `Please recap the "${seriesName}" series. The reader has read these books (in order): ${seriesBooks.map((b, i) => `${i+1}. ${b.title} (${b.year})`).join(", ")}. Give a short recap of each book and a "What to remember" section with the 3–5 most important things going into the next installment.` }]
        })
      });
      const data = await res.json();
      setSeriesRecap({ series: seriesName, books: seriesBooks, text: data.content?.[0]?.text || data.error?.message || "Could not generate recap." });
    } catch { setSeriesRecap({ series: seriesName, books: seriesBooks, text: "Connection error. Please check your API key and try again." }); }
    finally { setSeriesLoading(false); }
  };

  const fetchIntentRecs = async (intentId, input = "") => {
    if (intentLoading[intentId]) return;
    setIntentLoading(p => ({ ...p, [intentId]: true }));
    const lastBook = books[books.length - 1];
    const lastAuthor = lastBook?.author || "Brandon Sanderson";
    const readTitles = new Set(books.map(b => b.title.toLowerCase()));
    const prompts = {
      "more-like": `The user's most recent read is "${lastBook?.title}" by ${lastAuthor}. Recommend 3 unread books with the same feel, themes, or writing style that this reader would love.`,
      "more-by-last": `The user's most recent author is ${lastAuthor}. Recommend 3 other books by ${lastAuthor} that the reader hasn't read yet. If all are read, recommend authors with very similar style.`,
      "similar-author": `Based on the reader loving ${lastAuthor}, recommend 3 books by authors with a very similar writing style, themes, or storytelling approach.`,
      "trending": `Recommend 3 books that are critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fit this reader's taste profile.`,
      "challenge": `This reader favors accessible genre fiction. Recommend 3 genuinely challenging, rewarding reads — dense classics, experimental fiction, or demanding long-form non-fiction.`,
      "quick": `Recommend 3 books under 300 pages that are deeply rewarding given this reader's taste (thrillers, literary fiction, fantasy).`,
      "gaps": `This reader's library skews Western/Indian/anglophone. Recommend 3 books from underrepresented literary traditions — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.`,
      "surprise": `Give 3 wildly unexpected book recommendations that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern picks.`,
      "finish": `This reader has started several long series. Recommend 3 books that are either perfect re-entry points to a series or similar series with satisfying completions.`,
      "loved": `The user loved: "${input}". Recommend 3 books with similar appeal — themes, pacing, emotional tone, or narrative style.`,
      "authors-like": `The user loves authors like ${input}. Recommend 3 books by different authors with very similar style, subject matter, or storytelling sensibility.`,
      "mood": `The user is in the mood for: "${input}". Recommend 3 books that perfectly match this emotional register or atmosphere.`,
      "genre-pick": `Recommend 3 excellent books in the genre: "${input}". Mix a modern standout, a timeless classic, and an underrated gem.`,
      "topic": `Recommend 3 books about: "${input}". Cross genre if needed — fiction, non-fiction, memoir.`,
      "occasion": `Recommend 3 books perfect for: "${input}". Match tone, length, and engagement level to the occasion.`,
      "pair": `The user wants to pair a book with: "${input}" (a film, show, event, or experience). Recommend 3 ideal companion reads.`,
    };
    try {
      const useWebSearch = intentId === "trending" || intentId === "pair";
      const body = {
        model: "claude-sonnet-4-6", max_tokens: 900,
        system: `You are a precise book recommendation engine. Reader history: ${READING_CONTEXT}\n\nCRITICAL: The reader has already read ALL of these books — do NOT recommend any of them under any circumstances: ${[...readTitles].join(", ")}.\n\nOnly recommend books the reader has NOT read. Double-check each recommendation against the list above before including it.\n\n${prompts[intentId] || input}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 3 items. Each: {"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}.`,
        messages: [{ role: "user", content: "JSON array only." }],
      };
      if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const txt = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const m = txt.match(/\[[\s\S]*?\]/);
      const parsed = m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim());
      setIntentResults(p => ({ ...p, [intentId]: Array.isArray(parsed) ? parsed.slice(0, 3) : [] }));
    } catch (e) {
      setIntentResults(p => ({ ...p, [intentId]: [{ title: "Could not load", author: "", year: 0, reason: e?.message || "Check your API key and try again." }] }));
    }
    setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
  };

  const addBook = () => {
    if (!newBook.title.trim() || !newBook.author.trim()) { setAddMsg("Title and author are required."); return; }
    setBooks(prev => [...prev, { ...newBook, id: nextId.current++, year: parseInt(newBook.year), pages: newBook.pages ? parseInt(newBook.pages) : null }]);
    setNewBook({ title: "", author: "", year: 2026, genre: "Fantasy", country: "", pages: "" });
    setAddMsg(`✓ "${newBook.title}" added to your library!`);
    setTimeout(() => setAddMsg(""), 4000);
  };

  const downloadCSV = () => {
    const rows = [["ID","Title","Author","Year","Genre","Country","Pages"], ...books.map(b => [b.id, `"${b.title}"`, `"${b.author}"`, b.year, b.genre, b.country || "", b.pages || ""])];
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
    .tab-btn { cursor: pointer; padding: 8px 18px; border-radius: 6px; border: 1px solid transparent; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; transition: all 0.2s; white-space: nowrap; color: ${G.text}; opacity: 0.6; }
    .tab-btn:hover { background: ${G.card2}; opacity: 1; }
    .tab-btn.active { background: ${G.card2}; border-color: ${G.goldDim}; color: ${G.gold}; opacity: 1; font-weight: 600; }
    .stat-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 20px 24px; transition: border-color 0.2s; }
    .stat-card:hover { border-color: ${G.goldDim}; }
    .genre-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
    .input-dark { background: ${G.card2}; border: 1px solid ${G.border}; border-radius: 8px; color: ${G.text}; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; outline: none; transition: border-color 0.2s; }
    .input-dark:focus { border-color: ${G.goldDim}; }
    .btn-gold { background: ${G.gold}; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-gold:hover { background: ${G.goldLight}; }
    .btn-ghost { background: transparent; color: ${G.muted}; border: 1px solid ${G.border}; border-radius: 8px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { color: ${G.text}; border-color: ${G.dimmed}; }
    .rec-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 18px; transition: all 0.2s; }
    .rec-card:hover { border-color: ${G.goldDim}; transform: translateY(-1px); }
    .chat-input-wrap { display: flex; gap: 10px; }
    .lib-row { display: grid; grid-template-columns: 1fr 140px 100px 56px 64px; gap: 12px; padding: 10px 16px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .lib-row:hover { background: ${G.card2}; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
  `;

  // ── TABS CONFIG ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview", icon: "◎", label: "Overview" },
    { id: "analysis", icon: "▦", label: "Analysis" },
    { id: "library", icon: "≡", label: "Library" },
    { id: "add", icon: "+", label: "Add Book" },
    { id: "recs", icon: "✦", label: "Recommendations" },
    { id: "series", icon: "⊙", label: "Series Recap" },
    { id: "chat", icon: "◈", label: "AI Chat" },
  ];


  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{ padding: "28px 28px 0", background: G.bg }}>
        {/* Centered logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <img src="./nairrative.png" alt="Nairrative" style={{ width: 349, height: 72, mixBlendMode: "multiply" }} />
        </div>

        <div style={{ display: "flex", gap: 4, overflowX: "auto", justifyContent: "center" }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "24px 28px" }} className="fade-in">

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (() => {
          const cb = id => { const r = getChartRange(id); return books.filter(b => b.year >= r.from && b.year <= r.to); };
          const fGen = new Set(["Fantasy","Sci-Fi","Thriller","Mystery","Literary Fiction","Historical Fiction","Classic","Horror"]);

          const ycBooks = cb("yc");
          const ycData = Object.entries(ycBooks.reduce((a,b)=>{a[b.year]=(a[b.year]||0)+1;return a;},{})).sort((a,b)=>Number(a[0])-Number(b[0])).map(([year,count])=>({year,count}));
          const ycMax = Math.max(...ycData.map(d=>d.count),1);

          const gcBooks = cb("gc");
          const gcData = Object.entries(gcBooks.reduce((a,b)=>{a[b.genre]=(a[b.genre]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([genre,count])=>({genre,count}));

          const fnBooks = cb("fn");
          const fnYrs = [...new Set(fnBooks.map(b=>b.year))].sort();
          const fnData = fnYrs.map(year=>{const yb=fnBooks.filter(b=>b.year===year);return{year,Fiction:yb.filter(b=>fGen.has(b.genre)).length,"Non-Fiction":yb.filter(b=>!fGen.has(b.genre)).length};});

          const geBooks = cb("ge");
          const geYrs = [...new Set(geBooks.map(b=>b.year))].sort();
          const geCount = geBooks.reduce((a,b)=>{a[b.genre]=(a[b.genre]||0)+1;return a;},{});
          const geTop5 = Object.entries(geCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([g])=>g);
          const geData = geYrs.map(year=>{const e={year};geTop5.forEach(g=>{e[g]=geBooks.filter(b=>b.year===year&&b.genre===g).length;});return e;});

          const acBooks = cb("ac");
          const acData = Object.entries(acBooks.reduce((a,b)=>{a[b.author]=(a[b.author]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([author,count])=>({author,count}));

          const coBooks = cb("co");
          const coData = Object.entries(coBooks.filter(b=>b.country).reduce((a,b)=>{a[b.country]=(a[b.country]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([country,count])=>({country,count}));

          const chartCard = (title, id, children) => (
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "18px 20px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text }}>{title}</div>
                <RangeFilter chartId={id} allYears={allYearsList} ranges={chartRanges} onSet={setChartRange} />
              </div>
              {children}
            </div>
          );

          return (
          <div>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Books Per Year */}
              {chartCard("Reading Activity by Year", "yc",
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ycData} barSize={18}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {ycData.map((e, i) => <Cell key={i} fill={e.count === ycMax ? G.gold : G.goldDim} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Genre Breakdown */}
              {chartCard("Genre Breakdown", "gc",
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gcData} layout="vertical" barSize={13}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="genre" tick={{ fill: G.text, fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {gcData.map((e, i) => <Cell key={i} fill={GENRE_COLORS[e.genre] || G.muted} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Fiction vs Non-Fiction */}
              {chartCard("Fiction vs Non-Fiction Over Time", "fn",
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fnData}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ color: G.muted, fontSize: 11 }} />
                    <Area type="monotone" dataKey="Fiction" stackId="1" stroke={G.gold} fill={G.gold} fillOpacity={0.35} />
                    <Area type="monotone" dataKey="Non-Fiction" stackId="1" stroke={G.blue} fill={G.blue} fillOpacity={0.35} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Genre Evolution */}
              {chartCard("Genre Evolution", "ge",
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={geData}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ color: G.muted, fontSize: 10 }} />
                    {geTop5.map(g => <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={GENRE_COLORS[g]} fill={GENRE_COLORS[g]} fillOpacity={0.5} />)}
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Top Authors */}
              {chartCard("Top Authors", "ac",
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={acData} layout="vertical" barSize={11}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="author" tick={{ fill: G.text, fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" fill={G.gold} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Author Origins */}
              {chartCard("Author Origins", "co",
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={coData} layout="vertical" barSize={11}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="country" tick={{ fill: G.text, fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" fill={G.green} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          );
        })()}

        {/* ── ANALYSIS ─────────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6 }}>Reading Analysis</div>
              <div style={{ color: G.muted, fontSize: 13 }}>Eleven lenses into {stats.total} books across {Object.keys(stats.byYear).length} active years.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>

              {/* 1 · TEMPORAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Temporal</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Volume & Pace</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.peakYear[1]}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>books in {analysisInsights.peakYear[0]}</div>
                  </div>
                  <div>
                    <div style={{ color: G.blue, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.avgPerActive}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>avg / active year</div>
                  </div>
                  <div>
                    <div style={{ color: G.red, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.maxGap}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>yr reading hiatus</div>
                  </div>
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  Your reading falls into two clear phases: a decade of consistent engagement (2011–2021), capped by an extraordinary pandemic peak, followed by a near-total halt. The 2025–26 return signals re-entry — a different reader resuming the habit, not the same one continuing it.
                </div>
              </div>

              {/* 2 · GENRE & FORM */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Genre & Form</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Migration Over Time</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.fictionPct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>fiction overall</div>
                  </div>
                  <div>
                    <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.genreCount}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>genres explored</div>
                  </div>
                  <div>
                    <div style={{ color: G.purple, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.graphicNovels}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>graphic novels</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {analysisInsights.genreEra.map(({ era, top }) => (
                    <div key={era} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                      <span style={{ color: G.muted }}>{era} </span>
                      <span style={{ color: GENRE_COLORS[top] || G.text, fontWeight: 600 }}>{top}</span>
                    </div>
                  ))}
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  A classic arc: commercial epic fantasy as entry drug → non-fiction intellectual expansion → romantasy as emotional reset. {analysisInsights.graphicNovels} graphic novels signal a strong visual storytelling thread throughout.
                </div>
              </div>

              {/* 3 · GEOGRAPHIC & CULTURAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.green}18`, color: G.green, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Geographic & Cultural</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Where Your Stories Come From</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.uniqueCountries}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>countries of origin</div>
                  </div>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.indiaPct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>Indian authors</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {analysisInsights.topCountries.map(([country, count]) => (
                    <div key={country} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: G.text }}>{country}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: G.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round(count / analysisInsights.topCountries[0][1] * 100)}%`, height: "100%", background: G.green, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: G.muted, width: 20, textAlign: "right" }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  Strong India thread — Tharoor, Mistry, Murugan, Rushdie, Roy, Ghosh — running alongside Western fantasy and global non-fiction. The library skews anglophone; French, Colombian, and Japanese voices are notable exceptions.
                </div>
              </div>

              {/* 4 · AUTHOR BEHAVIOR */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Author Behavior</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Loyalty vs. Sampling</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.loyaltyRatio}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>from loyal authors (5+)</div>
                  </div>
                  <div>
                    <div style={{ color: G.red, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.sampledCount}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>one-time reads</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {analysisInsights.loyal.slice(0, 5).map(([author, count]) => (
                    <div key={author} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: G.text }}>{author}</span>
                      <span style={{ fontSize: 11, color: G.gold, fontWeight: 600 }}>{count} books</span>
                    </div>
                  ))}
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  You're a completionist. When an author clicks, you read everything — Sanderson's entire Cosmere, all seven HP books, every Kingsbridge novel. The discovery-to-catalogue pipeline is your dominant reading pattern.
                </div>
              </div>

              {/* 5 · THEMATIC */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Thematic</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Recurring Intellectual Preoccupations</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { theme: "Political Systems & Power", note: "Tharoor, Ambedkar, Obama, Kelkar/Shah, Ayyub, Chaturvedi — a sustained inquiry into how power is built and abused.", color: G.gold },
                    { theme: "Indian Identity & History", note: "Roy, Mistry, Rushdie, Dalrymple, Pillai — reading India through multiple lenses simultaneously.", color: G.blue },
                    { theme: "Science, Climate & Civilisation", note: "Harari, Pinker, Klein, Gates, Lane, Wohlleben — the arc of life, society, and its fragility.", color: G.green },
                    { theme: "Philosophy of Mind", note: "Ramachandran, Kahneman, Eagleman — consciousness, cognition, and the strange machinery of the self.", color: G.purple },
                  ].map(({ theme, note, color }) => (
                    <div key={theme}>
                      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2 }}>{theme}</div>
                      <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6 }}>{note}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 · SOCIAL & CONTEXTUAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Social & Contextual</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Life Shapes the List</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { year: "2015", event: "World Tour", note: "Only 6 books during a 125-day journey. Travel replaced reading — lived experience over vicarious.", books: 6 },
                    { year: "2019", event: "Literary Expansion", note: "26 books including a surge of Indian literary fiction — possibly tied to a period of national introspection.", books: 26 },
                    { year: "2020–21", event: "Pandemic Peak", note: "64 books in two years. Lockdown created the rarest of gifts: uninterrupted reading time.", books: 64 },
                    { year: "2022–24", event: "Life Transition", note: "Near-total halt after the pandemic peak. A major life change suppressed the reading habit.", books: 3 },
                    { year: "2025–26", event: "Romantasy Return", note: "Comeback led by ACOTAR and Empyrean — lighter, character-driven escapism as re-entry mode.", books: 15 },
                  ].map(({ year, event, note, books: b }) => (
                    <div key={year} style={{ display: "flex", gap: 10 }}>
                      <div style={{ minWidth: 52 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: G.gold }}>{year}</div>
                        <div style={{ fontSize: 10, color: G.muted }}>{b} books</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: G.text, marginBottom: 2 }}>{event}</div>
                        <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6 }}>{note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7 · COMPLEXITY & CHALLENGE */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.red}18`, color: G.red, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Complexity & Challenge</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Stretching vs. Comfort</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.red, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.challengePct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>literary / challenging</div>
                  </div>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{100 - analysisInsights.challengePct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>commercial / accessible</div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Notable stretches</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["Dostoevsky", "Danielewski", "Nabokov", "Rushdie", "Eco", "Vonnegut", "Ambedkar", "Karve"].map(a => (
                      <span key={a} style={{ background: `${G.red}15`, color: G.red, fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  You oscillate between difficult and accessible — Dostoevsky and Danielewski sit alongside Eragon and Dan Brown. The intellectual stretches cluster in 2017–21; comfort reads bookend the journey.
                </div>
              </div>

              {/* 8 · SERIES VS STANDALONE */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.green}18`, color: G.green, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Series vs. Standalone</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Commitment Patterns</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.seriesPct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>in known series</div>
                  </div>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.seriesCount}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>series books read</div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Series fates</div>
                  {[
                    { name: "Harry Potter", status: "Completed", color: G.green },
                    { name: "Inheritance Cycle", status: "Completed", color: G.green },
                    { name: "Mistborn + Cosmere", status: "Ongoing (current)", color: G.green },
                    { name: "ACOTAR + Empyrean", status: "In progress", color: G.gold },
                    { name: "Wheel of Time", status: "Abandoned at book 3", color: G.red },
                    { name: "Skyward", status: "Paused at book 2", color: G.red },
                  ].map(({ name, status, color }) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: G.text }}>{name}</span>
                      <span style={{ fontSize: 10, color, fontWeight: 600 }}>{status}</span>
                    </div>
                  ))}
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  You rarely abandon a series mid-stream — until you do. The WoT dropout and Skyward pause both correlate with life disruptions, not quality issues.
                </div>
              </div>

              {/* 9 · EMOTIONAL ARC */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Emotional Arc</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Mood Mapping by Era</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  {analysisInsights.fictionByEra.map(({ era, pct }) => (
                    <div key={era}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: G.text }}>{era}</span>
                        <span style={{ fontSize: 11, color: G.purple, fontWeight: 600 }}>{pct}% fiction</span>
                      </div>
                      <div style={{ height: 5, background: G.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(to right, ${G.purple}, ${G.gold})`, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75 }}>
                  Early years: pure escapism. Mid-journey: fiction drops as intellectual curiosity expands into non-fiction. Pandemic: both modes peak simultaneously. Return: fiction-dominant again, this time emotionally-driven romantasy.
                </div>
              </div>

              {/* 10 · RE-READ BEHAVIOR */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Re-read Behavior</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>What Gets Revisited</div>
                <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: G.text, marginBottom: 4, fontWeight: 600 }}>Known re-read: Harry Potter (2016)</div>
                  <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6 }}>Five years after the first read, suggesting an emotional return rather than a critical one. Re-reads of formative books function as anchor rituals, not nostalgia.</div>
                </div>
                <div style={{ color: G.muted, fontSize: 12, lineHeight: 1.75, marginBottom: 12 }}>
                  Re-read data isn't currently tracked. Given your completionist patterns, revisits are likely deliberate — worth capturing as a separate event. Consider adding a re-read flag when logging.
                </div>
                <div style={{ background: `${G.gold}10`, border: `1px solid ${G.goldDim}`, borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, color: G.gold }}>Prediction: early Cosmere and ACOTAR are likely re-read candidates when the next Stormlight or Empyrean installment releases.</div>
                </div>
              </div>

              {/* 11 · DISCOVERY CHANNEL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Discovery Channel</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>How Books Find You</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  {[
                    { channel: "Author Rabbit Hole", example: "One Sanderson → 25 Cosmere books. One Follett → entire Kingsbridge series. The pipeline is your primary discovery mode.", color: G.gold },
                    { channel: "Cultural Moment", example: "HP re-read in 2016. ACOTAR / Empyrean in 2025–26 — likely driven by streaming adaptations and social reading culture.", color: G.blue },
                    { channel: "Geographic Identity", example: "Surge of Indian authors during 2017–21 — a period of deliberate cultural re-engagement visible in the data.", color: G.green },
                    { channel: "Peer & Social", example: "Highly probable but untraceable — the unrecorded social layer beneath every reading list.", color: G.purple },
                  ].map(({ channel, example, color }) => (
                    <div key={channel}>
                      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2 }}>{channel}</div>
                      <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6 }}>{example}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: `${G.blue}10`, border: `1px solid ${G.blue}30`, borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, color: G.blue }}>Add a "discovered via" field when logging future books to make this dimension fully trackable.</div>
                </div>
              </div>

              {/* 12 · CUSTOM ANALYSIS CHAT */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Custom Analysis</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 6px" }}>Ask Anything About Your Library</div>
                <div style={{ fontSize: 11, color: G.muted, marginBottom: 16 }}>Query your {books.length}-book reading history with natural language. Try: "What % of my books are by women authors?" or "Which year had the most non-fiction?"</div>
                {analysisChat.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
                    {analysisChat.map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "85%", background: m.role === "user" ? `${G.gold}18` : G.card2, border: `1px solid ${m.role === "user" ? G.goldDim : G.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {analysisChatLoading && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.muted }}>Analysing…</div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input-dark"
                    style={{ flex: 1 }}
                    placeholder="Ask a question about your reading data…"
                    value={analysisChatInput}
                    onChange={e => setAnalysisChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAnalysisChat()}
                    disabled={analysisChatLoading}
                  />
                  <button className="btn-gold" onClick={sendAnalysisChat} disabled={analysisChatLoading || !analysisChatInput.trim()} style={{ whiteSpace: "nowrap" }}>
                    {analysisChatLoading ? "…" : "Ask"}
                  </button>
                  {analysisChat.length > 0 && (
                    <button className="btn-ghost" onClick={() => setAnalysisChat([])} style={{ whiteSpace: "nowrap" }}>Clear</button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div>
            {/* Single filter row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <input className="input-dark" style={{ width: 200, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              <MultiSelect options={allGenres} selected={libGenres} onChange={setLibGenres} placeholder="Genre" style={{ width: 148, flex: "0 0 auto" }} />
              <MultiSelect options={allYears} selected={libYears} onChange={setLibYears} placeholder="Year" style={{ width: 108, flex: "0 0 auto" }} />
              <MultiSelect options={allAuthors} selected={libAuthors} onChange={setLibAuthors} placeholder="Author" style={{ width: 180, flex: "0 0 auto" }} />
              <select className="input-dark" style={{ width: 128, flex: "0 0 auto" }} value={libSort} onChange={e => setLibSort(e.target.value)}>
                <option value="year">Sort: Year</option>
                <option value="title">Sort: Title</option>
                <option value="author">Sort: Author</option>
              </select>
              <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filteredBooks.length} books</span>
              <div style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={downloadCSV}>↓ CSV</button>
              <button className="btn-ghost" onClick={downloadJSON}>↓ JSON</button>
            </div>

            {/* Table Header */}
            <div className="lib-row" style={{ background: G.card2, borderRadius: "8px 8px 0 0", borderBottom: `1px solid ${G.border}` }}>
              {["Title", "Author", "Genre", "Pages", "Year"].map(h => (
                <div key={h} style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 520, overflowY: "auto" }}>
              {filteredBooks.map(b => (
                <div key={b.id} className="lib-row">
                  <div style={{ fontSize: 13, fontWeight: 500, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: G.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.author}</div>
                  <div><span className="genre-pill" style={{ background: `${GENRE_COLORS[b.genre] || G.dimmed}20`, color: GENRE_COLORS[b.genre] || G.muted }}>{b.genre}</span></div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.pages || "—"}</div>
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

              <button className="btn-ghost" onClick={autoFillBookDetails} disabled={autoFilling || !newBook.title.trim() || !newBook.author.trim()}
                style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", borderColor: G.goldDim, color: autoFilling ? G.muted : G.gold }}>
                {autoFilling ? "Filling in details…" : "✦ Auto-fill Genre, Country & Pages via AI"}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Year</div>
                  <input className="input-dark" type="number" min="1900" max="2030" value={newBook.year} onChange={e => setNewBook(p => ({ ...p, year: e.target.value }))} />
                </div>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Pages</div>
                  <input className="input-dark" type="number" min="1" placeholder="e.g. 350" value={newBook.pages} onChange={e => setNewBook(p => ({ ...p, pages: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Genre</div>
                  <select className="input-dark" value={newBook.genre} onChange={e => setNewBook(p => ({ ...p, genre: e.target.value }))}>
                    {Object.keys(GENRE_COLORS).map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Country of Author</div>
                  <input className="input-dark" placeholder="e.g. USA" value={newBook.country} onChange={e => setNewBook(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <button className="btn-gold" style={{ marginTop: 6 }} onClick={addBook}>Add to My Library</button>
              {addMsg && (
                <div style={{ padding: "12px 16px", borderRadius: 8, background: addMsg.startsWith("✓") ? "#1a2e1a" : "#2e1a1a", border: `1px solid ${addMsg.startsWith("✓") ? "#2d5a2d" : "#5a2d2d"}`, color: addMsg.startsWith("✓") ? G.green : G.red, fontSize: 13 }}>
                  {addMsg}
                </div>
              )}
            </div>

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
        {activeTab === "recs" && (() => {
          const lastBook = books[books.length - 1];
          const allGenreOptions = Object.keys(GENRE_COLORS);

          const LENSES = [
            // Auto-load panels
            { id: "more-like", icon: "◈", title: "More Like Last Book", sub: `Based on "${lastBook?.title}"`, auto: true },
            { id: "more-by-last", icon: "◉", title: "More By Last Author", sub: `Everything by ${lastBook?.author}`, auto: true },
            { id: "similar-author", icon: "◎", title: "Books By Similar Author", sub: `Authors like ${lastBook?.author}`, auto: true },
            { id: "trending", icon: "⊛", title: "What's Trending", sub: "Culturally buzzy · award-listed · 2024–26", auto: true },
            { id: "challenge", icon: "△", title: "Challenge Me", sub: "Dense, difficult, demanding works", auto: true },
            { id: "quick", icon: "≡", title: "Quick Reads", sub: "Under 300 pages, deeply rewarding", auto: true },
            { id: "gaps", icon: "⊕", title: "Fill My Gaps", sub: "Traditions & voices not yet in your library", auto: true },
            { id: "surprise", icon: "✦", title: "Surprise Me", sub: "Wildly unexpected — off-pattern picks", auto: true },
            { id: "finish", icon: "⊙", title: "Finish the Series", sub: "Re-entry points or similar completable series", auto: true },
            // Input panels
            { id: "loved", icon: "◑", title: "If You Loved…", sub: "", auto: false, placeholder: "A book title…", inputLabel: "Enter a book you loved" },
            { id: "authors-like", icon: "◷", title: "Books By Authors Like…", sub: "", auto: false, placeholder: "An author name…", inputLabel: "Enter an author" },
            { id: "mood", icon: "◐", title: "Match My Mood", sub: "", auto: false, placeholder: "Describe the vibe…", inputLabel: "What are you in the mood for?" },
            { id: "genre-pick", icon: "▦", title: "By Genre", sub: "", auto: false, isDropdown: true, dropdownOptions: allGenreOptions, inputLabel: "Choose a genre" },
            { id: "topic", icon: "◫", title: "By Topic", sub: "", auto: false, placeholder: "AI, colonialism, ecology…", inputLabel: "Enter a topic or theme" },
            { id: "occasion", icon: "◇", title: "For the Occasion", sub: "", auto: false, placeholder: "Beach read, book club, long flight…", inputLabel: "What's the occasion?" },
            { id: "pair", icon: "⊞", title: "Pair It", sub: "Web-searched companion reads", auto: false, placeholder: "A film, show, event, or experience…", inputLabel: "Pair a book with…" },
          ];

          const RecList = ({ results, loading }) => {
            if (loading) return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: G.dimmed, fontSize: 11, minWidth: 14, marginTop: 1 }}>{i}.</span>
                    <div style={{ flex: 1 }}>
                      <div className="pulse" style={{ height: 12, width: "70%", background: G.border, borderRadius: 4, marginBottom: 4 }} />
                      <div style={{ height: 10, width: "50%", background: G.dimmed, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            );
            if (!results) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: G.gold, fontSize: 11, fontFamily: "'Playfair Display', serif", minWidth: 14, marginTop: 2 }}>{i + 1}.</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: G.text, lineHeight: 1.4 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: G.gold, marginBottom: 2 }}>{r.author}{r.year ? ` · ${r.year}` : ""}</div>
                      {r.reason && <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.5 }}>{r.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          };

          return (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 4 }}>Recommendations</div>
                <div style={{ color: G.muted, fontSize: 13 }}>16 lenses for discovery — auto-loaded panels refresh instantly, input panels respond to your query.</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {LENSES.map(lens => {
                  const results = intentResults[lens.id];
                  const loading = !!intentLoading[lens.id];
                  const input = intentInputs[lens.id] || "";
                  const canFetch = lens.auto || (lens.isDropdown ? !!input : !!input.trim());

                  return (
                    <div key={lens.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                          <span style={{ color: G.gold, fontSize: 13 }}>{lens.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: G.text }}>{lens.title}</span>
                        </div>
                        {(results || loading) && (
                          <button onClick={() => { setIntentResults(p => { const n={...p}; delete n[lens.id]; return n; }); fetchIntentRecs(lens.id, input); }}
                            style={{ background: "none", border: "none", color: G.muted, fontSize: 10, cursor: "pointer", padding: 0, lineHeight: 1 }} title="Refresh">↺</button>
                        )}
                      </div>
                      {lens.sub && <div style={{ fontSize: 10, color: G.muted, marginBottom: 8, paddingLeft: 20 }}>{lens.sub}</div>}

                      {/* Input for non-auto panels */}
                      {!lens.auto && (
                        <div style={{ marginBottom: 8 }}>
                          {lens.isDropdown ? (
                            <select className="input-dark" style={{ fontSize: 12, padding: "7px 10px" }}
                              value={input}
                              onChange={e => setIntentInputs(p => ({ ...p, [lens.id]: e.target.value }))}>
                              <option value="">— pick a genre —</option>
                              {lens.dropdownOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input className="input-dark" style={{ fontSize: 12 }} placeholder={lens.placeholder}
                              value={input}
                              onChange={e => setIntentInputs(p => ({ ...p, [lens.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter" && input.trim()) fetchIntentRecs(lens.id, input); }} />
                          )}
                          <button className="btn-gold" style={{ marginTop: 6, width: "100%", fontSize: 11, padding: "7px 0" }}
                            disabled={loading || !canFetch}
                            onClick={() => fetchIntentRecs(lens.id, input)}>
                            {loading ? "…" : "Get Picks"}
                          </button>
                        </div>
                      )}

                      {/* Results */}
                      <RecList results={results} loading={loading} />

                      {/* Empty state for auto panels still loading first time */}
                      {lens.auto && !results && !loading && (
                        <div style={{ fontSize: 11, color: G.dimmed, marginTop: 8 }}>
                          <button onClick={() => fetchIntentRecs(lens.id)} style={{ background: "none", border: `1px solid ${G.border}`, color: G.muted, fontSize: 11, borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>Load picks</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── SERIES RECAP ──────────────────────────────────────────────── */}
        {activeTab === "series" && (() => {
          const allSeries = [...new Set(books.filter(b => b.series).map(b => b.series))].sort();
          const seriesCounts = allSeries.map(s => ({ name: s, count: books.filter(b => b.series === s).length }))
            .sort((a, b) => b.count - a.count);

          return (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 4 }}>Series Recap</div>
                <div style={{ color: G.muted, fontSize: 13 }}>Pick a series to get an AI catch-up before continuing — key characters, plot beats, and what to remember.</div>
              </div>

              {/* Series picker */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                {seriesCounts.slice(0, 20).map(({ name, count }) => (
                  <button key={name} onClick={() => { setSelectedSeries(name); setSeriesRecap(null); }}
                    style={{ background: selectedSeries === name ? `${G.gold}15` : G.card, border: `1px solid ${selectedSeries === name ? G.goldDim : G.border}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedSeries === name ? G.gold : G.text }}>{name}</span>
                    <span style={{ fontSize: 10, color: G.muted, background: G.card2, borderRadius: 10, padding: "1px 6px" }}>{count}</span>
                  </button>
                ))}
              </div>

              {selectedSeries && (
                <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
                  {/* Series header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text, marginBottom: 4 }}>{selectedSeries}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {books.filter(b => b.series === selectedSeries).sort((a, b) => a.id - b.id).map(b => (
                          <span key={b.id} style={{ fontSize: 11, color: G.muted, background: G.card2, border: `1px solid ${G.border}`, borderRadius: 4, padding: "2px 8px" }}>{b.title}</span>
                        ))}
                      </div>
                    </div>
                    <button className="btn-gold" style={{ flexShrink: 0, marginLeft: 12 }} disabled={seriesLoading}
                      onClick={() => generateSeriesRecap(selectedSeries)}>
                      {seriesLoading ? "Generating…" : "✦ Generate Recap"}
                    </button>
                  </div>

                  {seriesLoading && (
                    <div className="pulse" style={{ color: G.gold, fontSize: 13, fontFamily: "'Playfair Display', serif", paddingTop: 8 }}>
                      Recapping your journey through {selectedSeries}…
                    </div>
                  )}

                  {seriesRecap && !seriesLoading && (
                    <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
                      <div style={{ fontSize: 13, color: G.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{seriesRecap.text}</div>
                    </div>
                  )}
                </div>
              )}

              {!selectedSeries && (
                <div style={{ textAlign: "center", padding: "40px 0", color: G.muted }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⊙</div>
                  <div style={{ fontSize: 13 }}>Select a series above to generate your catch-up recap.</div>
                  <div style={{ fontSize: 12, color: G.dimmed, marginTop: 6 }}>Works best when you want to continue a series after a gap or before a new release.</div>
                </div>
              )}

              {allSeries.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: G.muted }}>
                  <div style={{ fontSize: 13 }}>No series data found. Make sure books have a series name in the Series field.</div>
                </div>
              )}
            </div>
          );
        })()}

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

      {/* FOOTER */}
      <div style={{ padding: "16px 28px", marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: G.dimmed }}>© {new Date().getFullYear()} Viswas Nair · All rights reserved</div>
      </div>
    </div>
  );
}