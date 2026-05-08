/**
 * Backfill book descriptions using the Anthropic API.
 * Run with: node --env-file=.env.local scripts/backfill-descriptions.mjs
 *
 * Outputs a SQL file: scripts/descriptions.sql
 * which can be applied to both main and dev Supabase projects.
 */

import { writeFileSync } from "fs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env.local");
  process.exit(1);
}

// All 369 books needing descriptions (fetched from dev DB)
const BOOKS = [
  { title: "The Naked Face", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Other Side of Midnight", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "A Stranger in the Mirror", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Bloodline", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Rage of Angels", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Master of the Game", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "If Tomorrow Comes", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Windmills of the Gods", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Sands of Time", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Memories of Midnight", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Doomsday Conspiracy", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Stars Shine Down", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Nothing Lasts Forever", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Morning Noon and Night", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Best Laid Plans", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Tell Me Your Dreams", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Sky is Falling", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "Are You Afraid of the Dark?", author: "Sidney Sheldon", genre: "Thriller" },
  { title: "The Andromeda Strain", author: "Michael Crichton", genre: "Science Fiction" },
  { title: "The Terminal Man", author: "Michael Crichton", genre: "Thriller" },
  { title: "The Great Train Robbery", author: "Michael Crichton", genre: "Historical Fiction" },
  { title: "Congo", author: "Michael Crichton", genre: "Thriller" },
  { title: "Sphere", author: "Michael Crichton", genre: "Science Fiction" },
  { title: "Jurassic Park", author: "Michael Crichton", genre: "Science Fiction" },
  { title: "Rising Sun", author: "Michael Crichton", genre: "Thriller" },
  { title: "Disclosure", author: "Michael Crichton", genre: "Thriller" },
  { title: "The Lost World", author: "Michael Crichton", genre: "Science Fiction" },
  { title: "Airframe", author: "Michael Crichton", genre: "Thriller" },
  { title: "Timeline", author: "Michael Crichton", genre: "Science Fiction" },
  { title: "Prey", author: "Michael Crichton", genre: "Thriller" },
  { title: "State of Fear", author: "Michael Crichton", genre: "Thriller" },
  { title: "Next", author: "Michael Crichton", genre: "Thriller" },
  { title: "Pirate Latitudes", author: "Michael Crichton", genre: "Thriller" },
  { title: "The Day of the Jackal", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "The Odessa File", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "The Dogs of War", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "The Fourth Protocol", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "The Fist of God", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "Icon", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "The Bourne Identity", author: "Robert Ludlum", genre: "Thriller" },
  { title: "The Bourne Supremacy", author: "Robert Ludlum", genre: "Thriller" },
  { title: "The Bourne Ultimatum", author: "Robert Ludlum", genre: "Thriller" },
  { title: "The Sigma Protocol", author: "Robert Ludlum", genre: "Thriller" },
  { title: "The Matarese Circle", author: "Robert Ludlum", genre: "Thriller" },
  { title: "The Bourne Legacy", author: "Eric Van Lustbader", genre: "Thriller" },
  { title: "The Bourne Betrayal", author: "Eric Van Lustbader", genre: "Thriller" },
  { title: "The Firm", author: "John Grisham", genre: "Legal Thriller" },
  { title: "The Pelican Brief", author: "John Grisham", genre: "Legal Thriller" },
  { title: "The Client", author: "John Grisham", genre: "Legal Thriller" },
  { title: "A Time to Kill", author: "John Grisham", genre: "Legal Thriller" },
  { title: "The Rainmaker", author: "John Grisham", genre: "Legal Thriller" },
  { title: "Coma", author: "Robin Cook", genre: "Medical Thriller" },
  { title: "Brain", author: "Robin Cook", genre: "Medical Thriller" },
  { title: "Terminal", author: "Robin Cook", genre: "Medical Thriller" },
  { title: "Toxin", author: "Robin Cook", genre: "Medical Thriller" },
  { title: "Hotel", author: "Arthur Hailey", genre: "Thriller" },
  { title: "Airport", author: "Arthur Hailey", genre: "Thriller" },
  { title: "Wheels", author: "Arthur Hailey", genre: "Thriller" },
  { title: "Not a Penny More, Not a Penny Less", author: "Jeffrey Archer", genre: "Thriller" },
  { title: "Shall We Tell the President?", author: "Jeffrey Archer", genre: "Thriller" },
  { title: "Kane and Abel", author: "Jeffrey Archer", genre: "Literary Fiction" },
  { title: "First Among Equals", author: "Jeffrey Archer", genre: "Thriller" },
  { title: "A Quiver Full of Arrows", author: "Jeffrey Archer", genre: "Thriller" },
  { title: "A Twist in the Tale", author: "Jeffrey Archer", genre: "Thriller" },
  { title: "The Hunt for Red October", author: "Tom Clancy", genre: "Thriller" },
  { title: "The Sum of All Fears", author: "Tom Clancy", genre: "Thriller" },
  { title: "Lucky", author: "Jackie Collins", genre: "Thriller" },
  { title: "Foundation", author: "Isaac Asimov", genre: "Science Fiction" },
  { title: "Foundation and Empire", author: "Isaac Asimov", genre: "Science Fiction" },
  { title: "Second Foundation", author: "Isaac Asimov", genre: "Science Fiction" },
  { title: "2001: A Space Odyssey", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "Dune", author: "Frank Herbert", genre: "Science Fiction" },
  { title: "A Scanner Darkly", author: "Philip K. Dick", genre: "Science Fiction" },
  { title: "Neuromancer", author: "William Gibson", genre: "Science Fiction" },
  { title: "Snow Crash", author: "Neal Stephenson", genre: "Science Fiction" },
  { title: "Ender's Game", author: "Orson Scott Card", genre: "Science Fiction" },
  { title: "The Time Machine", author: "H.G. Wells", genre: "Science Fiction" },
  { title: "Rainbows End", author: "Vernor Vinge", genre: "Science Fiction" },
  { title: "Slaughterhouse-Five", author: "Kurt Vonnegut", genre: "Science Fiction" },
  { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", genre: "Science Fiction" },
  { title: "Broca's Brain", author: "Carl Sagan", genre: "Popular Science" },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", genre: "History" },
  { title: "The Selfish Gene", author: "Richard Dawkins", genre: "Popular Science" },
  { title: "The God Delusion", author: "Richard Dawkins", genre: "Philosophy" },
  { title: "Surely You're Joking, Mr. Feynman", author: "Richard Feynman", genre: "Memoir" },
  { title: "The Pleasure of Finding Things Out", author: "Richard Feynman", genre: "Popular Science" },
  { title: "Freakonomics", author: "Steven Levitt & Stephen Dubner", genre: "Economics" },
  { title: "I, Cyborg", author: "Kevin Warwick", genre: "Popular Science" },
  { title: "Born on a Blue Day", author: "Daniel Tammet", genre: "Memoir" },
  { title: "The Power of Now", author: "Eckhart Tolle", genre: "Philosophy" },
  { title: "The Story of My Experiments with Truth", author: "Mahatma Gandhi", genre: "Memoir" },
  { title: "Mein Kampf", author: "Adolf Hitler", genre: "History" },
  { title: "The Motorcycle Diaries", author: "Che Guevara", genre: "Memoir" },
  { title: "A Short History of Nearly Everything", author: "Bill Bryson", genre: "Popular Science" },
  { title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy" },
  { title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", genre: "Fantasy" },
  { title: "The Da Vinci Code", author: "Dan Brown", genre: "Thriller" },
  { title: "Angels and Demons", author: "Dan Brown", genre: "Thriller" },
  { title: "Digital Fortress", author: "Dan Brown", genre: "Thriller" },
  { title: "Deception Point", author: "Dan Brown", genre: "Thriller" },
  { title: "The Alchemist", author: "Paulo Coelho", genre: "Literary Fiction" },
  { title: "Veronika Decides to Die", author: "Paulo Coelho", genre: "Literary Fiction" },
  { title: "Eleven Minutes", author: "Paulo Coelho", genre: "Literary Fiction" },
  { title: "The Fountainhead", author: "Ayn Rand", genre: "Literary Fiction" },
  { title: "Atlas Shrugged", author: "Ayn Rand", genre: "Literary Fiction" },
  { title: "We the Living", author: "Ayn Rand", genre: "Literary Fiction" },
  { title: "Anthem", author: "Ayn Rand", genre: "Literary Fiction" },
  { title: "Night of January 16th", author: "Ayn Rand", genre: "Literary Fiction" },
  { title: "The Unbearable Lightness of Being", author: "Milan Kundera", genre: "Literary Fiction" },
  { title: "Life of Pi", author: "Yann Martel", genre: "Literary Fiction" },
  { title: "The Curious Incident of the Dog in the Night-Time", author: "Mark Haddon", genre: "Literary Fiction" },
  { title: "Siddhartha", author: "Hermann Hesse", genre: "Literary Fiction" },
  { title: "God's Debris", author: "Scott Adams", genre: "Philosophy" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", genre: "Literary Fiction" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Literary Fiction" },
  { title: "The Enchantress of Florence", author: "Salman Rushdie", genre: "Literary Fiction" },
  { title: "1984", author: "George Orwell", genre: "Dystopian" },
  { title: "Animal Farm", author: "George Orwell", genre: "Dystopian" },
  { title: "Brave New World", author: "Aldous Huxley", genre: "Dystopian" },
  { title: "The Mystery of the Whispering Mummy", author: "Robert Arthur", genre: "Mystery" },
  { title: "Rendezvous with Rama", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "Rama II", author: "Arthur C. Clarke & Gentry Lee", genre: "Science Fiction" },
  { title: "The Garden of Rama", author: "Arthur C. Clarke & Gentry Lee", genre: "Science Fiction" },
  { title: "Rama Revealed", author: "Arthur C. Clarke & Gentry Lee", genre: "Science Fiction" },
  { title: "2010: Odyssey Two", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "2061: Odyssey Three", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "3001: The Final Odyssey", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "Blindsight", author: "Peter Watts", genre: "Science Fiction" },
  { title: "The Afghan", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "Childhood's End", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "Like the Flowing River", author: "Paulo Coelho", genre: "Essays" },
  { title: "Eragon", author: "Christopher Paolini", genre: "Fantasy" },
  { title: "Eldest", author: "Christopher Paolini", genre: "Fantasy" },
  { title: "Brisingr", author: "Christopher Paolini", genre: "Fantasy" },
  { title: "The White Tiger", author: "Aravind Adiga", genre: "Literary Fiction" },
  { title: "Sea of Poppies", author: "Amitav Ghosh", genre: "Historical Fiction" },
  { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Lolita", author: "Vladimir Nabokov", genre: "Literary Fiction" },
  { title: "World War Z", author: "Max Brooks", genre: "Horror" },
  { title: "House of Leaves", author: "Mark Z. Danielewski", genre: "Horror" },
  { title: "Persepolis", author: "Marjane Satrapi", genre: "Memoir" },
  { title: "Maus", author: "Art Spiegelman", genre: "History" },
  { title: "Breakfast of Champions", author: "Kurt Vonnegut", genre: "Literary Fiction" },
  { title: "The Colour of Magic", author: "Terry Pratchett", genre: "Fantasy" },
  { title: "The Light Fantastic", author: "Terry Pratchett", genre: "Fantasy" },
  { title: "Journey to the Center of the Earth", author: "Jules Verne", genre: "Science Fiction" },
  { title: "Gora", author: "Rabindranath Tagore", genre: "Literary Fiction" },
  { title: "Inheritance", author: "Christopher Paolini", genre: "Fantasy" },
  { title: "Elantris", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Vagabonding", author: "Rolf Potts", genre: "Travel" },
  { title: "Anzacs at War", author: "Commando Comics", genre: "Graphic Novel" },
  { title: "Mistborn", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "The Well of Ascension", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "The Hero of Ages", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "The Alloy of Law", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Warbreaker", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "The Way of Kings", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Micro", author: "Michael Crichton", genre: "Thriller" },
  { title: "Love in the Time of Cholera", author: "Gabriel Garcia Marquez", genre: "Literary Fiction" },
  { title: "Foundation's Edge", author: "Isaac Asimov", genre: "Science Fiction" },
  { title: "The Mysterious Flame of Queen Leona", author: "Umberto Eco", genre: "Literary Fiction" },
  { title: "Batman: Year One", author: "Frank Miller", genre: "Graphic Novel" },
  { title: "Batman: The Killing Joke", author: "Alan Moore", genre: "Graphic Novel" },
  { title: "My Story", author: "Kamala Das", genre: "Memoir" },
  { title: "The Redbreast", author: "Jo Nesbo", genre: "Thriller" },
  { title: "The Story of Philosophy", author: "Will Durant", genre: "Philosophy" },
  { title: "The Immortals of Meluha", author: "Amish Tripathi", genre: "Fantasy" },
  { title: "The Secret of the Nagas", author: "Amish Tripathi", genre: "Fantasy" },
  { title: "V for Vendetta", author: "Alan Moore & David Lloyd", genre: "Dystopian" },
  { title: "The Oath of the Vayuputras", author: "Amish Tripathi", genre: "Fantasy" },
  { title: "Upanishads", author: "Patrick Olivelle (trans.)", genre: "Philosophy" },
  { title: "White Mughals", author: "William Dalrymple", genre: "History" },
  { title: "The Lost Symbol", author: "Dan Brown", genre: "Thriller" },
  { title: "The Eye of the World", author: "Robert Jordan", genre: "Fantasy" },
  { title: "Steve Jobs", author: "Walter Isaacson", genre: "Biography" },
  { title: "The Great Indian Novel", author: "Shashi Tharoor", genre: "Literary Fiction" },
  { title: "The Lies of Locke Lamora", author: "Scott Lynch", genre: "Fantasy" },
  { title: "The Great Hunt", author: "Robert Jordan", genre: "Fantasy" },
  { title: "Phantoms in the Brain", author: "V.S. Ramachandran", genre: "Popular Science" },
  { title: "Moonward", author: "Appupen", genre: "Literary Fiction" },
  { title: "The Itch of the Wooden Splinter", author: "Sumit Kumar", genre: "Literary Fiction" },
  { title: "Manna", author: "Marshall Brain", genre: "Science Fiction" },
  { title: "You Just Don't Understand", author: "Deborah Tannen", genre: "Psychology" },
  { title: "Masters of Doom", author: "David Kushner", genre: "Biography" },
  { title: "The Day You Discard Your Body", author: "Marshall Brain", genre: "Popular Science" },
  { title: "The Dragon Reborn", author: "Robert Jordan", genre: "Fantasy" },
  { title: "Kushiel's Dart", author: "Jacqueline Carey", genre: "Fantasy" },
  { title: "Marker", author: "Robin Cook", genre: "Medical Thriller" },
  { title: "Paranoid", author: "Joseph Finder", genre: "Thriller" },
  { title: "The Kill List", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "The Angel Experiment", author: "James Patterson", genre: "Science Fiction" },
  { title: "The Player of Games", author: "Iain M. Banks", genre: "Science Fiction" },
  { title: "The Atlantis Gene", author: "A.G. Riddle", genre: "Thriller" },
  { title: "The Silver Tower", author: "Matt Fitzgerald", genre: "Thriller" },
  { title: "Lonely Planet South East Asia on a Shoestring", author: "Lonely Planet", genre: "Travel" },
  { title: "The Martian", author: "Andy Weir", genre: "Science Fiction" },
  { title: "Words of Radiance", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Shadows of Self", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "The Emperor's Soul", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Harry Potter and the Prisoner of Azkaban", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Harry Potter and the Goblet of Fire", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Harry Potter and the Order of the Phoenix", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Harry Potter and the Half-Blood Prince", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Harry Potter and the Deathly Hallows", author: "J.K. Rowling", genre: "Fantasy" },
  { title: "Inferno", author: "Dan Brown", genre: "Thriller" },
  { title: "A Thousand Splendid Suns", author: "Khaled Hosseini", genre: "Literary Fiction" },
  { title: "Cradle and All", author: "James Patterson", genre: "Thriller" },
  { title: "Step on a Crack", author: "James Patterson", genre: "Thriller" },
  { title: "The Vital Question", author: "Nick Lane", genre: "Popular Science" },
  { title: "Scion of Ishvaku", author: "Amish Tripathi", genre: "Fantasy" },
  { title: "Revelation Space", author: "Alastair Reynolds", genre: "Science Fiction" },
  { title: "Gone Girl", author: "Gillian Flynn", genre: "Thriller" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", genre: "Dystopian" },
  { title: "Mahabharata", author: "Amar Chitra Katha", genre: "Mythology" },
  { title: "Swami and Friends", author: "R.K. Narayan", genre: "Literary Fiction" },
  { title: "Smoke and Mirrors", author: "Neil Gaiman", genre: "Fantasy" },
  { title: "The God of Small Things", author: "Arundhati Roy", genre: "Literary Fiction" },
  { title: "Murder on the Orient Express", author: "Agatha Christie", genre: "Mystery" },
  { title: "And Then There Were None", author: "Agatha Christie", genre: "Mystery" },
  { title: "Sixth of the Dusk", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Endless Night", author: "Agatha Christie", genre: "Mystery" },
  { title: "The Murder of Roger Ackroyd", author: "Agatha Christie", genre: "Mystery" },
  { title: "Zero to One", author: "Peter Thiel", genre: "Business" },
  { title: "Statistics: A Graphic Guide", author: "Eileen Magnello & Borin Van Loon", genre: "Popular Science" },
  { title: "The Emperor of All Maladies", author: "Siddhartha Mukherjee", genre: "Popular Science" },
  { title: "The Legends of Halahala", author: "Appupen", genre: "Fantasy" },
  { title: "Seveneves", author: "Neal Stephenson", genre: "Science Fiction" },
  { title: "The Songs of Distant Earth", author: "Arthur C. Clarke", genre: "Science Fiction" },
  { title: "Aspyrus", author: "Appupen", genre: "Literary Fiction" },
  { title: "Sum", author: "David Eagleman", genre: "Philosophy" },
  { title: "Oathbringer", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Arcanum Unbounded", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Enlightenment Now", author: "Steven Pinker", genre: "History" },
  { title: "The Fox", author: "Frederick Forsyth", genre: "Thriller" },
  { title: "Elon Musk", author: "Ashlee Vance", genre: "Biography" },
  { title: "Origin", author: "Dan Brown", genre: "Thriller" },
  { title: "The Hidden Life of Trees", author: "Peter Wohlleben", genre: "Popular Science" },
  { title: "Cathedral", author: "Raymond Carver", genre: "Literary Fiction" },
  { title: "Sita", author: "Amish Tripathi", genre: "Fantasy" },
  { title: "The Guernsey Literary and Potato Peel Pie Society", author: "Mary Ann Shaffer & Annie Barrows", genre: "Literary Fiction" },
  { title: "When Breath Becomes Air", author: "Paul Kalanithi", genre: "Memoir" },
  { title: "Marvel 1602", author: "Neil Gaiman", genre: "Graphic Novel" },
  { title: "DC Universe Rebirth", author: "Geoff Johns", genre: "Graphic Novel" },
  { title: "All the Names They Used for God", author: "Anjali Sachdeva", genre: "Literary Fiction" },
  { title: "The Pillars of the Earth", author: "Ken Follett", genre: "Historical Fiction" },
  { title: "World Without End", author: "Ken Follett", genre: "Historical Fiction" },
  { title: "The Sirens of Titan", author: "Kurt Vonnegut", genre: "Science Fiction" },
  { title: "A Column of Fire", author: "Ken Follett", genre: "Historical Fiction" },
  { title: "How to Win an Indian Election", author: "Shivam Shankar Singh", genre: "Politics" },
  { title: "Em and the Big Hoom", author: "Jerry Pinto", genre: "Literary Fiction" },
  { title: "The Courtesan, the Mahatma & the Italian Brahmin", author: "Manu S. Pillai", genre: "History" },
  { title: "The Verdict", author: "Prannoy Roy & Dorab Sopariwala", genre: "Politics" },
  { title: "In Love with the World", author: "Yongey Mingyur Rinpoche", genre: "Spirituality" },
  { title: "A Fine Balance", author: "Rohinton Mistry", genre: "Literary Fiction" },
  { title: "The Ministry of Utmost Happiness", author: "Arundhati Roy", genre: "Literary Fiction" },
  { title: "Alice in Wonderland", author: "Lewis Carroll", genre: "Literary Fiction" },
  { title: "Superforecasting", author: "Philip Tetlock & Dan Gardner", genre: "Psychology" },
  { title: "Skyward", author: "Brandon Sanderson", genre: "Science Fiction" },
  { title: "One Part Woman", author: "Perumal Murugan", genre: "Literary Fiction" },
  { title: "Gujarat Files: Anatomy of a Cover Up", author: "Rana Ayyub", genre: "Politics" },
  { title: "I Am a Troll", author: "Swati Chaturvedi", genre: "Politics" },
  { title: "The Buddha's Non-Sectarian Teachings", author: "S.N. Goenka", genre: "Spirituality" },
  { title: "The Forty Rules of Love", author: "Elif Shafak", genre: "Literary Fiction" },
  { title: "Eileen", author: "Ottessa Moshfegh", genre: "Literary Fiction" },
  { title: "10 Minutes 38 Seconds in This Strange World", author: "Elif Shafak", genre: "Literary Fiction" },
  { title: "A Suitable Boy", author: "Vikram Seth", genre: "Literary Fiction" },
  { title: "Open", author: "Andre Agassi", genre: "Memoir" },
  { title: "Cari Mora", author: "Thomas Harris", genre: "Thriller" },
  { title: "Einstein: His Life and Universe", author: "Walter Isaacson", genre: "Biography" },
  { title: "Leonardo da Vinci", author: "Walter Isaacson", genre: "Biography" },
  { title: "Ghalib: A Thousand Desires", author: "Raza Mir", genre: "Poetry" },
  { title: "The Rise and Fall of the Dinosaurs", author: "Steve Brusatte", genre: "Popular Science" },
  { title: "A Gentleman in Moscow", author: "Amor Towles", genre: "Literary Fiction" },
  { title: "Ishmael", author: "Daniel Quinn", genre: "Literary Fiction" },
  { title: "No One is Too Small to Make a Difference", author: "Greta Thunberg", genre: "Politics" },
  { title: "The Ivory Throne", author: "Manu S. Pillai", genre: "History" },
  { title: "Born a Crime", author: "Trevor Noah", genre: "Memoir" },
  { title: "An Astronaut's Guide to Life on Earth", author: "Chris Hadfield", genre: "Memoir" },
  { title: "I Am Malala", author: "Malala Yousafzai", genre: "Memoir" },
  { title: "Buddha Vol. 1-8", author: "Osamu Tezuka", genre: "Spirituality" },
  { title: "The Shape of Ideas", author: "Grant Snider", genre: "Art" },
  { title: "The Audacity of Hope", author: "Barack Obama", genre: "Politics" },
  { title: "Circe", author: "Madeline Miller", genre: "Fantasy" },
  { title: "Becoming", author: "Michelle Obama", genre: "Memoir" },
  { title: "I Will Judge You by Your Bookshelf", author: "Grant Snider", genre: "Art" },
  { title: "A Promised Land", author: "Barack Obama", genre: "Memoir" },
  { title: "Macbeth", author: "Shakespeare & Matt Wiegle", genre: "Literary Fiction" },
  { title: "To Sleep in a Sea of Stars", author: "Christopher Paolini", genre: "Science Fiction" },
  { title: "Caste", author: "Isabel Wilkerson", genre: "History" },
  { title: "The Evening and the Morning", author: "Ken Follett", genre: "Historical Fiction" },
  { title: "Sapiens", author: "Yuval Noah Harari", genre: "History" },
  { title: "Homo Deus", author: "Yuval Noah Harari", genre: "History" },
  { title: "How Not to Be Wrong", author: "Jordan Ellenberg", genre: "Popular Science" },
  { title: "Atomic Habits", author: "James Clear", genre: "Self-Help" },
  { title: "Fall of Giants", author: "Ken Follett", genre: "Historical Fiction" },
  { title: "21 Lessons for the 21st Century", author: "Yuval Noah Harari", genre: "History" },
  { title: "Romeo and Juliet", author: "Shakespeare & Matt Wiegle", genre: "Literary Fiction" },
  { title: "The Cock is the Culprit", author: "Unni R.", genre: "Literary Fiction" },
  { title: "An Era of Darkness", author: "Shashi Tharoor", genre: "History" },
  { title: "A Tiger for Malgudi", author: "R.K. Narayan", genre: "Literary Fiction" },
  { title: "How to Avoid a Climate Disaster", author: "Bill Gates", genre: "Environment" },
  { title: "The Reluctant Fundamentalist", author: "Mohsin Hamid", genre: "Literary Fiction" },
  { title: "Train to Pakistan", author: "Khushwant Singh", genre: "Literary Fiction" },
  { title: "The Spy and the Traitor", author: "Ben Macintyre", genre: "History" },
  { title: "Yuganta", author: "Irawati Karve", genre: "History" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", genre: "Literary Fiction" },
  { title: "Meditations", author: "Marcus Aurelius", genre: "Philosophy" },
  { title: "Midnight's Children", author: "Salman Rushdie", genre: "Literary Fiction" },
  { title: "Born to Run", author: "Christopher McDougall", genre: "Sports" },
  { title: "Artemis", author: "Andy Weir", genre: "Science Fiction" },
  { title: "Economics in One Lesson", author: "Henry Hazlitt", genre: "Economics" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss", genre: "Fantasy" },
  { title: "Project Hail Mary", author: "Andy Weir", genre: "Science Fiction" },
  { title: "Nudge", author: "Richard Thaler & Cass Sunstein", genre: "Economics" },
  { title: "The Wise Man's Fear", author: "Patrick Rothfuss", genre: "Fantasy" },
  { title: "Annihilation of Caste", author: "B.R. Ambedkar", genre: "History" },
  { title: "A Feast of Vultures", author: "Josy Joseph", genre: "Politics" },
  { title: "The Case for Climate Capitalism", author: "Tom Rand", genre: "Environment" },
  { title: "In Service of the Republic", author: "Vijay Kelkar & Ajay Shah", genre: "Economics" },
  { title: "Silent Spring", author: "Rachel Carson", genre: "Environment" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "Psychology" },
  { title: "The Notebook, The Proof, The Third Lie", author: "Agota Kristof", genre: "Literary Fiction" },
  { title: "Good Economics for Hard Times", author: "Abhijit Banerjee & Esther Duflo", genre: "Economics" },
  { title: "Poonachi", author: "Perumal Murugan", genre: "Literary Fiction" },
  { title: "This Changes Everything", author: "Naomi Klein", genre: "Environment" },
  { title: "The Five Love Languages", author: "Gary Chapman", genre: "Self-Help" },
  { title: "Child 44", author: "Tom Rob Smith", genre: "Thriller" },
  { title: "Starsight", author: "Brandon Sanderson", genre: "Science Fiction" },
  { title: "Thinking in Systems", author: "Donella Meadows", genre: "Popular Science" },
  { title: "A Court of Thorns and Roses", author: "Sarah J. Maas", genre: "Romantasy" },
  { title: "Dawnshard", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Secret of Secrets", author: "Dan Brown", genre: "Thriller" },
  { title: "Heart Lamp", author: "Banu Mushtaq", genre: "Literary Fiction" },
  { title: "The Silent Patient", author: "Alex Michaelides", genre: "Thriller" },
  { title: "Cinema Speculation", author: "Quentin Tarantino", genre: "Film Criticism" },
  { title: "A Court of Mist and Fury", author: "Sarah J. Maas", genre: "Romantasy" },
  { title: "A Court of Wings and Ruin", author: "Sarah J. Maas", genre: "Romantasy" },
  { title: "A Court of Frost and Starlight", author: "Sarah J. Maas", genre: "Romantasy" },
  { title: "A Court of Silver Flames", author: "Sarah J. Maas", genre: "Romantasy" },
  { title: "Fourth Wing", author: "Rebecca Yarros", genre: "Romantasy" },
  { title: "Iron Flame", author: "Rebecca Yarros", genre: "Romantasy" },
  { title: "Onyx Storm", author: "Rebecca Yarros", genre: "Romantasy" },
  { title: "Tress of the Emerald Sea", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Yumi and the Nightmare Painter", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Rumble in the Jungle", author: "Commando Comics", genre: "Graphic Novel" },
  { title: "300", author: "Frank Miller & Lynn Varley", genre: "Graphic Novel" },
  { title: "Physics of the Impossible", author: "Michio Kaku", genre: "Popular Science" },
  { title: "The Company of Women", author: "Khushwant Singh", genre: "Literary Fiction" },
  { title: "The Inscrutable Americans", author: "Anurag Mathur", genre: "Literary Fiction" },
  { title: "The Blue Nowhere", author: "Jeffery Deaver", genre: "Thriller" },
  { title: "The Devil's Teardrop", author: "Jeffery Deaver", genre: "Thriller" },
  { title: "The League of Extraordinary Gentlemen", author: "Alan Moore", genre: "Graphic Novel" },
  { title: "Sin City, Book 1: The Hard Goodbye", author: "Frank Miller", genre: "Graphic Novel" },
  { title: "Sin City, Book 3: The Big Fat Kill", author: "Frank Miller", genre: "Graphic Novel" },
  { title: "The Bone Collector", author: "Jeffery Deaver", genre: "Thriller" },
  { title: "The Coffin Dancer", author: "Jeffery Deaver", genre: "Thriller" },
  { title: "The Vanished Man", author: "Jeffery Deaver", genre: "Thriller" },
  { title: "Red Dragon", author: "Thomas Harris", genre: "Thriller" },
  { title: "The Silence of the Lambs", author: "Thomas Harris", genre: "Thriller" },
  { title: "Hannibal", author: "Thomas Harris", genre: "Thriller" },
  { title: "Hannibal Rising", author: "Thomas Harris", genre: "Thriller" },
  { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", genre: "Thriller" },
  { title: "The Frugal Wizard's Handbook for Surviving Medieval England", author: "Brandon Sanderson", genre: "Fantasy" },
  { title: "Eye of the Needle", author: "Ken Follett", genre: "Historical Fiction" },
  { title: "Recursion", author: "Blake Crouch", genre: "Sci-Fi" },
  { title: "What I Talk About When I Talk About Running", author: "Haruki Murakami", genre: "Memoir" },
  { title: "Norse Mythology", author: "Neil Gaiman", genre: "Fantasy" },
  { title: "Tau Zero", author: "Poul Anderson", genre: "Sci-Fi" },
];

const BATCH_SIZE = 30;

async function generateDescriptions(batch) {
  const bookList = batch
    .map((b, i) => `${i + 1}. "${b.title}" by ${b.author} [${b.genre}]`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: `You are a librarian writing short, spoiler-free book descriptions. For each book provided, write exactly 2 sentences: one describing what the book is about, one noting why it is notable or what kind of reader it suits. Be factual, engaging, and never reveal plot twists or endings. Return a JSON array where each element is an object with "title" (exact title as given) and "description" (the 2-sentence text). No markdown, just raw JSON.`,
      messages: [
        {
          role: "user",
          content: `Write descriptions for these books:\n\n${bookList}\n\nReturn a JSON array with objects {title, description}.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();
  // Strip markdown code fences if present
  const jsonStr = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(jsonStr);
}

function escSql(str) {
  return str.replace(/'/g, "''");
}

async function main() {
  const results = [];
  const batches = [];
  for (let i = 0; i < BOOKS.length; i += BATCH_SIZE) {
    batches.push(BOOKS.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${BOOKS.length} books in ${batches.length} batches of up to ${BATCH_SIZE}...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Batch ${i + 1}/${batches.length}: ${batch[0].title} → ${batch[batch.length - 1].title}`);
    try {
      const descriptions = await generateDescriptions(batch);
      results.push(...descriptions);
      // Small delay to avoid rate limits
      if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ERROR in batch ${i + 1}:`, err.message);
      // Add placeholders for failed batch
      batch.forEach(b => results.push({ title: b.title, description: "" }));
    }
  }

  // Build SQL
  const values = results
    .filter(r => r.description)
    .map(r => `('${escSql(r.title)}', '${escSql(r.description)}')`)
    .join(",\n  ");

  const sql = `-- Book description backfill
-- Apply to BOTH main (nhcmtjmqpahlrvbcyksl) and dev (bascesztzoprxzdtzmmo) Supabase projects
-- Matches by title, handles all duplicate IDs in main DB automatically

UPDATE books
SET description = data.description
FROM (
  VALUES
  ${values}
) AS data(title, description)
WHERE books.title = data.title
  AND (books.description IS NULL OR books.description = '');
`;

  writeFileSync("scripts/descriptions.sql", sql);
  console.log(`\nDone! ${results.filter(r => r.description).length}/${BOOKS.length} descriptions generated.`);
  console.log("SQL written to scripts/descriptions.sql");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
