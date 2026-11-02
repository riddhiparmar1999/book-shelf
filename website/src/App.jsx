import Header from "./components/Header";
import Hero from "./components/Hero";
import Books from "./components/Books";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="page">
      <Header />
      <main>
        <Hero />
        <Books />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
