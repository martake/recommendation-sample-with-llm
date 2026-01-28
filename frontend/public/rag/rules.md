# Synthetic Recommender Benchmark - Rules and Definitions

## 1. Purchase Rules (購買ルール)

### 1.1 User Attributes
Each user has RGB color attributes:
- `r`: Red component (0-255)
- `g`: Green component (0-255)
- `b`: Blue component (0-255)

### 1.2 Item Attributes
Each item has:
- `color`: One of R (Red), G (Green), or B (Blue)
- `count`: A number from 1 to 10
- Total items: 30 (3 colors × 10 counts)
- Item IDs: R-1, R-2, ..., R-10, G-1, ..., G-10, B-1, ..., B-10

### 1.3 Purchase Decision Rule
A user purchases an item if their corresponding color component exceeds the threshold T (default: 160):
- If item.color == R → user purchases if user.r >= T
- If item.color == G → user purchases if user.g >= T
- If item.color == B → user purchases if user.b >= T

The `count` attribute does not affect purchase decisions (reserved for future use).

### 1.4 Threshold Interpretation
With threshold T=160:
- Probability that a random user (uniform 0-255) exceeds threshold: (255-160+1)/256 ≈ 37.5%
- Users with high R value tend to purchase Red items
- Users with high G value tend to purchase Green items
- Users with high B value tend to purchase Blue items

## 2. Recommendation Methods (推薦方式)

### 2.1 Random
- Proposes items uniformly at random from all 30 items
- No learning or personalization
- Serves as a baseline for comparison

### 2.2 Memory-based Collaborative Filtering
- Uses item-item similarity computed from training data
- Similarity is based on co-purchase patterns (cosine similarity)
- For new users:
  - First proposal is random
  - After purchases, recommends items similar to purchased items
  - Builds user preference online through interactions

### 2.3 Model-based Collaborative Filtering
- Uses Matrix Factorization (MF) with user/item embeddings
- Trained using SGD on implicit feedback (purchase/non-purchase)
- For new users:
  - First proposal is random
  - After each interaction, updates user embedding via online SGD
  - Proposes items with highest predicted score

## 3. Evaluation Metrics (評価指標)

### 3.1 Purchase Rate
- Formula: `purchased_count / (N_users × 10)`
- Interpretation: Proportion of proposals that resulted in purchases
- Higher is better for recommendation quality

### 3.2 Purchased Users
- Count of users who made at least one purchase
- Shows coverage of recommendation effectiveness

### 3.3 Average Purchases per User
- Formula: `total_purchases / N_users`
- Maximum possible: 10 (if every proposal results in purchase)

### 3.4 Color Breakdown
- Purchases split by item color (R/G/B)
- Shows which colors the method tends to recommend successfully

### 3.5 Histogram
- Distribution of purchases per user (0 to 10)
- Shows variance in recommendation effectiveness across users

## 4. Experimental Protocol (実験プロトコル)

### 4.1 Training Phase
1. Generate N_train users with random RGB values
2. For each user, randomly propose 10 items
3. Record purchase decisions based on the purchase rule
4. Train MF model on this data
5. Compute item-item similarity matrix

### 4.2 Inference Phase
1. Generate N_infer new users (different from training)
2. For each user and each method:
   - Make 10 sequential proposals
   - Each proposal considers user's history (for CF methods)
   - Record purchase decisions
3. Compute metrics for each method

### 4.3 Seed and Reproducibility
- All random operations use seeded PRNG
- Same seed produces identical results
- Different seeds used for different stages to ensure independence

## 5. Expected Results (期待される結果)

### 5.1 Method Comparison
- Model-based CF should outperform Random significantly
- Memory-based CF should also outperform Random
- Model-based may outperform Memory-based due to online adaptation

### 5.2 Why CF Methods Work Better
- CF methods learn user preferences from interactions
- They can infer that a user who likes Red items has high R value
- They then recommend more Red items to that user
- Random has no such adaptation capability
