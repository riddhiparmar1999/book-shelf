import { useState } from "react";

const emptyForm = {
  name: "",
  email: "",
  message: "",
};

function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [sent, setSent] = useState(false);

  const updateField = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (sent) setSent(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setForm(emptyForm);
  };

  return (
    <section className="contact" id="contact" aria-labelledby="contact-heading">
      <div className="contact__layout">
        <div className="section-intro section-intro--left">
          <h2 id="contact-heading">Contact us</h2>
          <p>
            Tell us what you&apos;re looking for, or ask about availability. We
            usually reply within one business day.
          </p>
        </div>

        <form className="contact__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              required
              value={form.name}
              onChange={updateField("name")}
              placeholder="Your name"
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={updateField("email")}
              placeholder="you@example.com"
            />
          </label>

          <label className="field field--full">
            <span>Message</span>
            <textarea
              name="message"
              rows={5}
              required
              value={form.message}
              onChange={updateField("message")}
              placeholder="How can we help?"
            />
          </label>

          <div className="contact__actions">
            <button type="submit" className="btn btn--primary">
              Send message
            </button>
            {sent && (
              <p className="contact__success" role="status">
                Thanks — we&apos;ll get back to you soon.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

export default Contact;
