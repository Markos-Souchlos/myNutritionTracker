--Dictionary tables
CREATE TABLE SYSTEM (
    ID SERIAL PRIMARY KEY,
    SYS VARCHAR(10) UNIQUE NOT NULL
);

INSERT INTO SYSTEM VALUES 
    (1, 'METRIC'),
    (2, 'IMPERIAL');



CREATE TABLE GENDER (
    ID SERIAL PRIMARY KEY,
    GEND VARCHAR(10) UNIQUE NOT NULL
);

INSERT INTO GENDER VALUES 
    (1, 'MALE'),
    (2, 'FEMALE');



CREATE TABLE LANGUAGE (
    ID SERIAL PRIMARY KEY,
    LANG VARCHAR(40) UNIQUE NOT NULL
);

INSERT INTO LANGUAGE VALUES 
    (1, 'ENGLISH'),
    (2, 'GREEK');



CREATE TABLE THEME (
    ID SERIAL PRIMARY KEY,
    THEM VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO THEME VALUES 
    (1, 'DARK'),
    (2, 'LIGHT'),
    (3, 'BLUE'),
    (4, 'RED');



CREATE TABLE ACTIVITY (
    ID SERIAL PRIMARY KEY,
    ACT VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO ACTIVITY VALUES 
    (1, 'SEDENTARY'),
    (2, 'LIGHTLY ACTIVE'),
    (3, 'MODERATELY ACTIVE'),
    (4, 'VERY ACTIVE'),
    (5, 'SUPER ACTIVE');


CREATE TABLE GOAL (
    ID SERIAL PRIMARY KEY,
    GOA VARCHAR(20) UNIQUE
);

INSERT INTO GOAL VALUES 
    (1, 'LOSE FAT'),
    (2, 'MAINTAIN WEIGHT'),
    (3, 'GAIN MUSCLE');



--User's login cridentials and information
CREATE TABLE USERS (
    ID SERIAL PRIMARY KEY,
    EMAIL VARCHAR(40) UNIQUE NOT NULL,
    PASSWORD VARCHAR(200) NOT NULL,
    LANGUAGE_ID INT NOT NULL DEFAULT 1 REFERENCES LANGUAGE(ID),
    SYSTEM_ID INT NOT NULL DEFAULT 1 REFERENCES SYSTEM(ID),
    THEME_ID INT NOT NULL DEFAULT 1 REFERENCES THEME(ID),
    ACTIVITY_ID INT NOT NULL DEFAULT 2 REFERENCES ACTIVITY(ID),
    GENDER_ID INT NOT NULL DEFAULT 1 REFERENCES GENDER(ID),
    GOAL_ID INT NOT NULL DEFAULT 1 REFERENCES GOAL(ID),
    HEIGHT FLOAT NOT NULL DEFAULT 171,
    WEIGHT FLOAT NOT NULL DEFAULT 80,
    CALORIES INT,
    PROT_PERC INT,
    FAT_PERC INT,
    CARB_PERC INT,
    PRO_MEMBER INT NOT NULL DEFAULT 0,
    BIRTH_DATE DATE
);



--Food data
CREATE TABLE FOODS (
    ID SERIAL PRIMARY KEY,
    NAME VARCHAR(40) UNIQUE,
    CAL INT NOT NULL DEFAULT 0,
    PROT FLOAT NOT NULL DEFAULT 0,
    FAT FLOAT NOT NULL DEFAULT 0,
    CARB FLOAT NOT NULL DEFAULT 0,
    ICON TEXT NOT NULL DEFAULT 'cultery.png',
    USER_ID INT REFERENCES USERS(ID),
    CONSTRAINT unique_food_user_id UNIQUE (NAME, USER_ID)
);

INSERT INTO FOODS (NAME, CAL, PROT, FAT, CARB, ICON) VALUES 
    ('Banana', 89, 1, 0, 23, 'banana.png'),
    ('Chicken Breast', 165, 31, 4, 0, 'chicken-breast.png'),
    ('Apple', 52, 0, 0, 14, 'apple.png'),
    ('Carrot', 41, 1, 0, 10, 'carrot.png'),
    ('Spinach', 23, 3, 0, 4, 'spinach.png'),
    ('Bread', 266, 10, 2, 49, 'baguette.png'),
    ('Milk', 42, 3, 1, 5, 'milk.png'),
    ('Almonds', 579, 21, 49, 22, 'almond.png'),
    ('Walnuts', 654, 15, 65, 14, 'wallnut.png'),
    ('Lentils', 353, 24, 1, 60, 'lentils.png'),
    ('Orange', 62, 1, 0, 15, 'orange.png'),
    ('Cheese', 402, 25, 33, 1, 'cheese.png'),
    ('Beef', 250, 26, 17, 0, 'steak.png'),
    ('Chicken Thigh', 250, 26, 17, 0, 'chicken.png'),
    ('Oatmeal', 68, 3, 1, 12, 'oatmeal.png'),
    ('Brown Rice', 111, 3, 1, 23, 'rice.png'),
    ('Broccoli', 55, 4, 1, 10, 'vegetable.png'),
    ('Olive oil', 884, 0, 100, 0, 'olive-oil.png'),
    ('Potato', 77, 2, 0, 17, 'potato.png'),
    ('Salmon', 208, 20, 13, 0, 'salmon.png'),
    ('Yogurt', 61, 4, 3, 5, 'yoghurt.png'),
    ('Tuna', 94, 20, 0, 0, 'canned-food.png'),
    ('Avocado', 160, 2, 15, 9, 'avocado.png'),
    ('Cherries', 50, 1, 0, 12, 'cherries.png'),
    ('Cucumber', 16, 1, 0, 4, 'cucumber.png'),
    ('Eggplant', 25, 1, 0, 6, 'eggplant.png'),
    ('Garlic', 149, 6, 1, 33, 'garlic.png'),
    ('Asparagus', 20, 2, 0, 4, 'asparagus.png'),
    ('Honey', 304, 0, 0, 82, 'honey.png'),
    ('Kiwi', 61, 1, 1, 15, 'kiwi.png'),
    ('Lemon', 29, 1, 0, 9, 'lemon.png'),
    ('Lettuce', 15, 1, 0, 3, 'lettuce.png'),
    ('Melon', 34, 1, 0, 8, 'melon.png'),
    ('Onion', 40, 1, 0, 9, 'onion.png'),
    ('Peanut Butter', 588, 25, 50, 20, 'peanut-butter.png'),
    ('Peanuts', 567, 26, 49, 16, 'peanuts.png'),
    ('Pear', 57, 0, 0, 15, 'pear.png'),
    ('Pepper', 20, 1, 0, 5, 'pepper.png'),
    ('Pineapple', 50, 1, 0, 13, 'pineapple.png'),
    ('Popcorn', 387, 13, 5, 77, 'popcorn.png'),
    ('Sardines', 208, 25, 11, 0, 'sardines.png'),
    ('Shrimp', 99, 24, 0, 0, 'shrimp.png'),
    ('Strawberry', 32, 1, 0, 8, 'strawberry.png'),
    ('Tofu', 76, 8, 5, 2, 'tofu.png'),
    ('Tomato', 18, 1, 0, 4, 'tomato.png'),
    ('Watermelon', 30, 1, 0, 8, 'watermelon.png'),
    ('Turkey', 189, 29, 7, 0, 'turkey.png'),
    ('Flour', 364, 10, 1, 76, 'flour.png'),
    ('Sugar', 387, 0, 0, 100, 'sugar.png'),
    ('Egg', 136, 12, 10, 1, 'egg.png'),
    ('Pasta', 360, 12, 2, 74, 'pasta.png'),
    ('Protein Scoop', 370, 74, 6, 6, 'whey-protein.png');

-- SELECT FOODS.* 
--     FROM FOODS 
--     LEFT JOIN USER_FOODS 
--     ON FOODS.ID = USER_FOODS.FOOD_ID 
--     AND USER_FOODS.USER_ID = 1 
--     WHERE (USER_FOODS.USER_ID IS NULL) 
--     AND (FOODS.USER_ID IS NULL OR FOODS.USER_ID = 1) 
--     ORDER BY NAME;



--Each user's log information
CREATE TABLE USER_FOODS (
    USER_ID INT REFERENCES USERS(ID),
    FOOD_ID INT REFERENCES FOODS(ID),
    GR INT 
);


--Each users history table
CREATE TABLE USER_HISTORY (
    USER_ID INT NOT NULL REFERENCES USERS(ID),
    CAL FLOAT NOT NULL, 
    PROT FLOAT NOT NULL, 
    FAT FLOAT NOT NULL, 
    CARB FLOAT NOT NULL, 
    DATE DATE
);

CREATE TABLE USER_PROGRESS (
    USER_ID INT NOT NULL REFERENCES USERS(ID),
    WEIGHT FLOAT,
    MUSCLE FLOAT,
    FAT FLOAT,
    DATE DATE
);
