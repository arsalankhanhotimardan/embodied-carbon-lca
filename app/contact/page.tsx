import React from 'react';

export default function ContactUs() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold text-green-700 mb-6">Contact Us</h1>
      <p className="text-lg mb-10 text-gray-600">
        Have questions about our tools, need support with your calculations, or want to discuss a custom feature? We would love to hear from you.
      </p>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-semibold mb-6 text-slate-800">Get in Touch</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">WhatsApp</h3>
              <p className="text-gray-900 mt-1">
                <a href="https://wa.me/923339359980" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition-colors font-medium">
                  +92 333 9359980
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Email</h3>
              <p className="text-green-700 mt-1 font-medium">contact@greenengineeringtools.com</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Lead Developer</h3>
              <p className="text-gray-900 mt-1">Engr. Arsalan Khan</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <form className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              type="text" 
              id="name" 
              className="w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-green-500 focus:ring-green-500 transition-colors" 
              placeholder="Your Name" 
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              id="email" 
              className="w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-green-500 focus:ring-green-500 transition-colors" 
              placeholder="your@email.com" 
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea 
              id="message" 
              rows={5} 
              className="w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-green-500 focus:ring-green-500 transition-colors" 
              placeholder="How can we help you?"
            ></textarea>
          </div>
          <button 
            type="button" 
            className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            Send Message
          </button>
        </form>
      </div>
    </main>
  );
}