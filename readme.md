This document explains how the Champion Suggestion System retrieves champion data from the API, what data it uses, and how that data is processed to generate personalized champion recommendations.

1. THE SHORT VERSION
The system retrieves the champion roster from GET /api/v1/characters.
The API provides the champion data used by the recommendation system.
The system does not hard-code individual champion profiles into the recommendation logic.
The user's quiz answers are compared against the corresponding champion attributes returned by the API.
Each champion receives a score based on how closely it matches the user's preferences.
The system ranks the champions and returns the strongest recommendations.
The API provides the champion data, while the frontend performs the recommendation and scoring.
The basic process is:
API
↓
Champion Roster
↓
User Answers and Champion Data
↓
Matching and Scoring
↓
Ranking
↓
Champion Recommendations

2. API CONNECTION
The suggestion system uses the project's champion API as its source of champion information.
The API base URL is:
https://cloud-computing-activity.vercel.app
The champion roster is retrieved using:
GET /api/v1/characters
Full request:
GET https://cloud-computing-activity.vercel.app/api/v1/characters
If API authentication is enabled, the request also includes the API key through the x-api-key header.
The suggestion system does not request every champion individually. It retrieves the roster and performs the recommendation calculations locally.

3. WHAT THE API RETURNS
The API returns a JSON object containing the available champions.
The response contains a count and a characters array. Each object inside the characters array represents one champion.
The suggestion system uses the characters array.
The number of champions does not need to be hard-coded into the recommendation logic. When additional champions are added to the API, they can be included in the recommendation process as long as they contain the required fields.

4. HOW THE SYSTEM USES API DATA
The API and the recommendation system have separate responsibilities.
The API provides champion information, champion characteristics, champion roles, champion difficulty, champion playstyle information, and other attributes used by the quiz.
The recommendation system handles displaying the quiz, recording the user's answers, comparing answers with champion attributes, calculating scores, applying partial-match rules, calculating percentages, ranking champions, selecting recommendations, and displaying the final results.
In simple terms, the API tells the system what each champion is like. The quiz tells the system what the user likes. The recommendation system finds the champions that best match the two.

5. CHAMPION FIELDS USED BY THE SUGGESTION SYSTEM
The recommendation system uses champion attributes returned by the API.
ID is used to identify the champion.
NAME is used to display the champion.
ROLE is used to determine how well the champion matches the user's preferred role.
PLAYSTYLE is used to determine how well the champion matches the user's preferred playstyle.
DIFFICULTY is used to determine how well the champion matches the user's preferred difficulty.
SKILL_FLOOR represents how difficult it is to use the champion effectively.
SKILL_CEILING represents the champion's potential for advanced mastery.
MOBILITY is used to compare the champion's mobility with the user's preference.
SURVIVABILITY is used to compare how durable the champion is with the user's preference.
MECHANICAL_DEMAND represents how mechanically demanding the champion is.
KIT_COMPLEXITY represents how complicated the champion's abilities and overall kit are.
POWER_CURVE represents when the champion is generally strongest during a match.
SNOWBALL_DEPENDENCE represents how strongly the champion benefits from gaining an early lead.
TEAM_DEPENDENCE represents how dependent the champion is on teammates.
ATTACK_TYPE identifies whether the champion primarily uses melee or ranged attacks.
DAMAGE_TYPE identifies the champion's primary damage type.
YEAR_RELEASED identifies when the champion was released.
Other fields may be returned by the API but do not necessarily affect the current recommendation calculation.

6. USER ANSWERS AND CHAMPION DATA
The system gets information from two different sources.
Champion information comes from the API.
For example, the API may provide a champion with the following characteristics:
Name: Kha'Zix
Role: Assassin
Playstyle: Ambush
Difficulty: Hard
Mobility: High
The user's preferences come from the recommendation quiz.
For example:
Preferred Role: Assassin
Preferred Playstyle: Ambush
Preferred Difficulty: Hard
Preferred Mobility: High
The system compares these two sets of information.
Champion Data plus User Preferences results in the matching and scoring process.

7. RECOMMENDATION QUESTIONS
The quiz uses multiple questions to determine the user's preferred champion characteristics.
Each question corresponds to one or more champion attributes provided by the API.
The questions are weighted differently because some characteristics are considered more important to the recommendation than others.
For example, playstyle and role can have greater influence on the final result than less important characteristics.
This prevents every question from having exactly the same influence on the final recommendation.

8. SCORING SYSTEM
Each champion receives points based on how well it matches the user's answers.
The general calculation is:
Champion Score equals the sum of points earned from matching the user's preferences.
For example, if a user selects:
Role: Assassin
Playstyle: Ambush
Difficulty: Hard
Mobility: High
and a champion has:
Role: Assassin
Playstyle: Ambush
Difficulty: Hard
Mobility: High
that champion receives points for each matching characteristic.
A champion that matches only some of these characteristics receives fewer points.

9. EXACT MATCHES
For standard categorical questions, an exact match receives the full number of points assigned to that question.
For example:
User Role: Assassin
Champion Role: Assassin
This produces a full role-match score.
If the champion instead has the role Mage, it does not receive the role-match points.

10. SECONDARY ROLE MATCHING
Champions can have multiple roles.
For example:
Fighter / Assassin
The system recognizes the individual roles instead of treating the entire string as one value.
Therefore, if the user selects Assassin, a champion with Fighter / Assassin can still receive partial credit.
The system uses a secondary-role multiplier of 0.6.
This means a secondary-role match receives 60 percent of the normal role-match points.
This prevents multi-role champions from being unfairly excluded from recommendations.

11. ORDERED CHARACTERISTICS
Some attributes have an order rather than being completely unrelated categories.
For example:
Low
Medium
High
When appropriate, the system can use the distance between the user's preference and the champion's value to provide partial credit.
For example, if the user prefers High and a champion has Medium, that is considered a closer match than a champion with Low.
This allows the recommendation system to distinguish between a champion that is slightly different from the user's preference and one that is significantly different.

12. DIFFICULTY-RELATED DATA
The API provides several difficulty-related characteristics.
DIFFICULTY provides a general difficulty classification such as Easy, Medium, or Hard.
SKILL_FLOOR represents how difficult it is to use the champion effectively.
SKILL_CEILING represents how much room the champion has for advanced mastery.
These values allow the recommendation system to distinguish between general difficulty and the amount of mastery a champion can offer.

13. SKIPPED QUESTIONS
Users do not have to provide an answer to every question.
A skipped question is not treated as a negative match against every champion.
Instead, the system adjusts the available maximum score according to the questions that were actually answered.
For example, if the total possible score is 100 points and the user skips a question worth 10 points, the available score becomes 90 points.
If a champion earns 72 points, its percentage would be:
72 divided by 90 multiplied by 100, which equals 80 percent.
This prevents skipped questions from unfairly lowering every champion's percentage.

14. PERCENTAGE CALCULATION
After the system calculates the points earned by a champion, it converts the score into a percentage.
The general formula is:
Percentage equals earned points divided by available points multiplied by 100.
For example:
Earned points: 72
Available points: 90
72 divided by 90 multiplied by 100 equals 80 percent.
The percentage represents how closely the champion matches the preferences provided by the user.

15. QUALIFICATION THRESHOLD
The system does not simply recommend every champion with a non-zero score.
A champion must reach the configured qualification threshold to be considered a strong enough recommendation.
The threshold was calibrated using randomized quiz simulations.
The system simulated thousands of random quiz combinations for the champion dataset to determine an appropriate qualification level.
This helps prevent weak matches from being presented as strong recommendations.

16. RANKING RECOMMENDATIONS
After every champion has been scored, the system ranks the results.
The ranking primarily considers:
1. Match percentage
2. Difficulty
3. Alphabetical order
The strongest qualifying champions are placed at the top.
The system normally displays the top three qualifying champions.

17. FALLBACK RECOMMENDATIONS
There may be cases where no champion reaches the qualification threshold.
Instead of returning no results, the system can use the closest available matches as a fallback.
This ensures that the user still receives useful champion suggestions even when their preferences do not strongly match any champion.

18. API REQUEST FREQUENCY
The recommendation system does not need to request champion information every time the user answers a question.
The roster is loaded once and reused during the recommendation process.
The data flow is:
Page loads
↓
GET /api/v1/characters
↓
Champion roster loaded
↓
User answers quiz
↓
Answers are processed locally
↓
Champions are scored locally
↓
Results are displayed
This reduces unnecessary API requests and allows the quiz to calculate results immediately.

19. ADDING A NEW CHAMPION
A new champion can be added to the API without creating a separate recommendation rule for that champion.
The champion should contain the fields required by the current recommendation system.
For example:
ID: 41
Game: League of Legends
Name: New Champion
Role: Assassin
Playstyle: Ambush
Difficulty: Hard
Skill Floor: 4
Skill Ceiling: 5
Mobility: High
Survivability: Medium
Mechanical Demand: High
Kit Complexity: High
Power Curve: Mid
Snowball Dependence: High
Team Dependence: Low
Attack Type: Melee
Damage Type: AD
Once the API includes the champion in the roster, the recommendation system can evaluate that champion using the existing scoring logic.

20. DATA CONSISTENCY
The recommendation system relies on consistent API values.
Multi-value fields such as ROLE may contain multiple values.
For example:
Fighter / Assassin
These values must use the expected format so the frontend can separate them correctly.
Ordered values must also remain consistent.
For example:
Low
Medium
High
Avoid changing them to values such as Low, Med, and High unless the recommendation logic is updated to recognize the new value.
Numeric fields such as SKILL_FLOOR, SKILL_CEILING, and YEAR_RELEASED should remain numeric.
For example:
Skill Floor: 4
should remain a number rather than being stored as the text "4" when the value is intended to be compared numerically.

21. MISSING API DATA
The recommendation system depends on the champion data being complete enough for the current quiz.
If a champion is missing a field used by a recommendation question, that champion may not receive points for that characteristic.
When adding a new champion, make sure the fields required by the recommendation system are present and use the same format as the existing entries.

22. API ENDPOINTS USED BY THE SUGGESTION SYSTEM
GET /api/v1/characters
Used: Yes
Purpose: Retrieves the champion roster used by the recommendation system.
GET /api/v1/characters/{id}
Used: No
Purpose: Individual champion requests are unnecessary because the complete roster is already loaded.
GET /api/v1/characters/search?q=...
Used: No
Purpose: Recommendation matching is performed locally using the loaded roster.
GET /health
Used: No
Purpose: The recommendation system does not require a separate health request.
GET /
Used: No
Purpose: The API welcome endpoint is not required by the recommendation system.

23. OVERALL DATA FLOW
The complete recommendation process is:
API
↓
GET /api/v1/characters
↓
Champion JSON Data
↓
Loaded Champion Roster
↓
User Answers plus Champion Attributes
↓
Matching Logic
↓
Score Each Champion
↓
Calculate Match Percentage
↓
Apply Qualification Threshold
↓
Rank Results
↓
Select Top Three Champions
↓
Display Recommendations

24. SUMMARY
The Champion Suggestion System separates champion data from recommendation logic.
The API provides the information that describes each champion. The frontend retrieves that information and compares it against the user's quiz answers.
The system then:
1. Retrieves the champion roster from the API.
2. Records the user's preferences.
3. Matches the preferences against champion attributes.
4. Awards points based on matching characteristics.
5. Applies partial credit for appropriate secondary or near matches.
6. Adjusts the available score when questions are skipped.
7. Converts the final scores into percentages.
8. Applies the qualification threshold.
9. Ranks the champions.
10. Displays the top recommendations.
In short:
The API provides the champion data. The quiz provides the user's preferences. The recommendation engine combines both to determine which champions best fit the user.