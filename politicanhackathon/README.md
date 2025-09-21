# AGORA - Nonpartisan Political Literacy App

A comprehensive political literacy platform that enables users to explore congressional representatives, track legislation, and engage in AI-powered political debates with authentic, emotionally-driven responses.

## 🎯 Features

### 🗺️ Interactive Congressional Map
- **Complete Coverage**: All 435 House Representatives + 100 Senators
- **State-by-State Layout**: Clean, organized view with party color coding
- **Member Profiles**: Detailed information for each representative
- **Real-time Data**: Up-to-date congressional information

### 🤖 AI-Powered Debate System
- **Authentic Responses**: Politicians speak with genuine emotion and personality
- **Regional Characteristics**: State-specific speaking patterns and concerns
- **Varied Formats**: Different response structures and conversation starters
- **Two Modes**:
  - **SOLO CHAT**: One-on-one conversations with any representative
  - **TRIAD DEBATE**: Moderated debates between two representatives

### 📊 Bill Tracker
- **Real-time Legislation**: Track active bills in Congress
- **Detailed Information**: Sponsors, timeline, and current status
- **Filter Options**: By chamber, status, and topic
- **Official Sources**: Data from Congress.gov and ProPublica

### 👥 Member Profiles
- **Comprehensive Data**: Biographies, political positions, voting records
- **Authentic Language**: Conversational, emotional descriptions
- **Regional Flavor**: State-specific personality traits
- **Contact Information**: Links to official sources

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Database**: SQLite with Prisma ORM
- **AI Integration**: Google Gemini API for debate responses
- **Styling**: Tailwind CSS
- **Data Sources**: Congress.gov, ProPublica, GovTrack.us

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jonathanyuan7/politicanhackathon.git
   cd politicanhackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma db push
   npm run db:seed-authentic
   ```

4. **Configure environment variables**
   Create a `.env` file:
   ```env
   DATABASE_URL="file:./dev.db"
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

5. **Start the development server**
```bash
npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── debate/            # Debate interface
│   │   ├── map/               # Congressional map
│   │   ├── bills/             # Bill tracker
│   │   └── member/            # Member profiles
│   ├── lib/                   # Core logic
│   │   ├── debate-system.ts   # AI debate system
│   │   ├── rag.ts            # Retrieval system
│   │   └── member-profiles.ts # Profile generation
│   └── components/            # React components
├── prisma/                    # Database schema and seeds
├── etl/                      # Data extraction scripts
└── prompts/                  # AI prompt templates
```

## 🎭 AI Debate System

The debate system features:

- **Authentic Personality**: Each politician has unique traits based on party, region, and committee assignments
- **Emotional Responses**: Genuine passion, frustration, and excitement
- **Regional Flavor**: State-specific expressions and concerns
- **Varied Formats**: Different conversation starters and response structures

### Example Response Styles

**Democratic Representative:**
> "Let me be clear - climate change is real, it's happening now, and we need bold action. I'm tired of the excuses and the delays. We have the technology, we have the solutions, we just need the political will to make it happen."

**Republican Representative:**
> "Look, I'm not denying climate change, but we need practical solutions that don't kill jobs. Let me tell you what I've seen in my district - families struggling to make ends meet. We can't just shut down industries overnight."

**Independent Representative:**
> "Both parties are missing the point on climate. The left wants to regulate everything, the right wants to ignore it. We need practical solutions that actually work."

## 🗄️ Database Schema

- **Members**: Congressional representatives with detailed profiles
- **Bills**: Legislative information and tracking
- **Committees**: Committee assignments and roles
- **Votes**: Voting records and positions
- **Documents**: RAG system content for context

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:seed-authentic` - Seed with authentic member data
- `npm run db:seed-official` - Seed with official government data

## 🌟 Key Features

### Open Source Approach
- Removed official data bias
- Authentic, conversational language
- Emotional and passionate responses
- Regional personality traits

### Real-time Data
- Live congressional information
- Current bill status
- Up-to-date member profiles
- Official government sources

### User Experience
- Intuitive navigation
- Responsive design
- Fast loading times
- Accessible interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Data sources: Congress.gov, ProPublica, GovTrack.us
- AI integration: Google Gemini API
- UI framework: Next.js and Tailwind CSS
- Database: Prisma ORM with SQLite

## 📞 Contact

**Jonathan Yuan** - [@jonathanyuan7](https://github.com/jonathanyuan7)

Project Link: [https://github.com/jonathanyuan7/politicanhackathon](https://github.com/jonathanyuan7/politicanhackathon)

---

**AGORA** - Making political literacy accessible, engaging, and authentic through technology.