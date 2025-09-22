# Committee Analytics Integration

## 🎯 Overview

This implementation integrates real committee data from the Congress.gov API to provide comprehensive analytics for congressional members and their committee work.

## 🔧 Components Created

### 1. Congress Committee API Client (`src/lib/congress-committee-api.ts`)

A comprehensive API client that interfaces with all Congress.gov committee endpoints:

**Key Features:**
- **Committee Overview**: Get all committees by chamber or congress
- **Detailed Committee Info**: Fetch specific committee details by system code
- **Committee Activity**: 
  - Recent bills considered
  - Published reports
  - Processed nominations
  - House/Senate communications
- **Analytics Generation**: Calculate productivity scores and member influence
- **Smart Caching**: 30-minute cache to optimize API usage
- **Name Matching**: Find committees by partial name matching

**API Endpoints Supported:**
```
GET /committee                               - All committees
GET /committee/{chamber}                     - Chamber-specific committees  
GET /committee/{congress}                    - Congress-specific committees
GET /committee/{congress}/{chamber}          - Filtered by congress & chamber
GET /committee/{chamber}/{committeeCode}     - Detailed committee info
GET /committee/{chamber}/{committeeCode}/bills           - Committee bills
GET /committee/{chamber}/{committeeCode}/reports         - Committee reports
GET /committee/{chamber}/{committeeCode}/nominations     - Committee nominations
GET /committee/{chamber}/{committeeCode}/house-communication    - House comms
GET /committee/{chamber}/{committeeCode}/senate-communication   - Senate comms
```

### 2. Analytics API Endpoints

#### A. General Committee Analytics (`src/app/api/analytics/committees/route.ts`)

**GET Endpoints:**
- `?type=overview&chamber=house|senate` - Committee productivity overview
- `?type=detail&chamber=house|senate&code=HSAG` - Detailed committee analytics
- `?type=bills&chamber=house|senate&code=HSAG` - Committee's recent bills
- `?type=reports&chamber=house|senate&code=HSAG` - Committee reports
- `?type=member-analytics&chamber=house&committees=Banking,Armed Services` - Member committee analysis

**POST Endpoint:**
- Bulk analysis of multiple committees with productivity scoring

#### B. Member Committee Analytics (`src/app/api/members/[id]/analytics/route.ts`)

**Features:**
- **Committee Influence Score**: Based on committee productivity and member participation
- **Leadership Potential**: Calculated from committee diversity and activity
- **Policy Specializations**: Auto-categorized based on committee assignments
- **Recent Activity Summary**: Bills, reports, nominations, communications
- **Productivity Analysis**: Average committee effectiveness scores

### 3. Enhanced Member Profiles

The member profile page now includes a comprehensive "Committee Analytics" section:

**Visual Components:**
- **Committee Influence Overview**: 4 key metrics with color-coded cards
- **Policy Specializations**: Auto-detected specialization tags
- **Recent Activity Summary**: Detailed breakdown of committee work
- **Recent Committee Bills**: List of latest bills considered
- **Data Attribution**: Clear sourcing from Congress.gov API

**Metrics Displayed:**
- Committee Assignments (total count)
- Average Productivity Score (0-100 scale)
- Leadership Potential Score (influence rating)
- Recent Bills Considered (last 6 months)

## 📊 Analytics Calculations

### Productivity Score (0-100)
```typescript
billScore = min(recentBills * 5, 40)           // Max 40 points
reportScore = min(recentReports * 10, 30)      // Max 30 points  
nominationScore = min(nominations * 15, 20)    // Max 20 points
communicationScore = min(communications * 2, 10) // Max 10 points
productivityScore = billScore + reportScore + nominationScore + communicationScore
```

### Leadership Potential Score
```typescript
committeeScore = min(committees * 15, 45)      // Max 45 for multiple committees
productivityBonus = min(avgProductivity * 0.3, 30) // Max 30 from productivity
activityBonus = min(recentBills * 2, 25)      // Max 25 from bill activity
leadershipScore = committeeScore + productivityBonus + activityBonus
```

### Policy Specializations
Auto-categorized based on committee names:
- Defense & National Security
- Financial Services & Economics  
- Judiciary & Legal Affairs
- Energy & Environment
- Health, Education & Labor
- Transportation & Infrastructure
- Agriculture & Nutrition
- Foreign Affairs & International Relations
- Homeland Security
- Veterans Affairs

## 🔑 API Key Setup

To enable full functionality, add your Congress.gov API key to `.env`:

```bash
CONGRESS_API_KEY=your_api_key_here
```

**Without API Key:**
- Limited to basic committee information
- Cached data and fallbacks still work
- Member analytics will show minimal data

**With API Key:**
- Full real-time committee data
- Comprehensive bill and report information
- Accurate productivity calculations
- Recent activity tracking

## 🚀 Usage Examples

### Get Committee Overview
```bash
curl "http://localhost:3000/api/analytics/committees?chamber=senate&type=overview"
```

### Get Member Committee Analytics  
```bash
curl "http://localhost:3000/api/members/PA_SEN_2/analytics"
```

### Bulk Committee Analysis
```bash
curl -X POST "http://localhost:3000/api/analytics/committees" \
  -H "Content-Type: application/json" \
  -d '{
    "chamber": "house",
    "committees": ["Banking", "Armed Services", "Energy"],
    "analysisType": "productivity"
  }'
```

## 📈 Performance Features

- **Smart Caching**: 20-30 minute cache for API responses
- **Parallel Processing**: Simultaneous committee analysis
- **Graceful Fallbacks**: Works with limited or no API access
- **Error Handling**: Comprehensive error recovery
- **Rate Limiting**: Built-in API usage optimization

## 🎨 UI Integration

The committee analytics seamlessly integrate into member profiles with:
- **Visual Consistency**: Purple/pink gradient theme matching the app
- **Responsive Design**: Mobile-friendly card layouts
- **Data Attribution**: Clear Congress.gov API sourcing
- **Loading States**: Graceful handling of API delays
- **Error Fallbacks**: Alternative displays when data unavailable

## 🔮 Future Enhancements

Potential extensions:
1. **Committee Comparison Tool**: Side-by-side committee analysis
2. **Member Ranking**: Productivity rankings within committees
3. **Bill Tracking**: Follow specific bills through committee process
4. **Historical Trends**: Committee productivity over time
5. **Advanced Filtering**: Filter by bill type, date ranges, topics
6. **Export Features**: PDF reports of committee analytics
7. **Real-time Alerts**: Notifications for new committee activity

This implementation provides a robust foundation for congressional committee analysis while maintaining excellent performance and user experience.
