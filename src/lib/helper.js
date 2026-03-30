import axios from "axios";
import jwt from "jsonwebtoken";

// export const uploadToCloudinary = async ({
//   file,
//   folder = "default-folder",
//   resourceType = "image",
//   width = 1080,
//   height = 1080,
//   crop = "fill", // Ensures the image is cropped to fill the square
// }) => {
//   const formData = new FormData();

//   formData.append("file", file);
//   formData.append(
//     "upload_preset",
//     process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
//   );
//   formData.append("folder", folder);
//   formData.append(
//     "transformation",
//     JSON.stringify([{ width, height, crop, aspect_ratio: "1.0" }])
//   );

//   const response = await axios.post(
//     `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
//     formData
//   );

//   return {
//     url: response.data.secure_url,
//     publicId: response.data.public_id,
//     isProfile: false,
//   };
// };

export const uploadToCloudinary = async ({
  file,
  folder = "default-folder",
  resourceType = "image",
  width = 1080, // Set desired width
  height = 1080, // Set desired height
  crop = "fill", // Ensures the image is resized properly
}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  );
  formData.append("folder", folder);
  // formData.append(
  //   "transformation",
  //   JSON.stringify([{ width, height, crop }])
  // );
  // formData.append("width", width);
  // formData.append("height", height);

  // formData.append("crop", crop);

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    formData
  );

  const transformedUrl = response.data.secure_url.replace(
    "/upload/",
    "/upload/w_1080,h_1080,c_fill/"
  );

  // return response.data.secure_url;
  return {
    url: transformedUrl,
    publicId: response.data.public_id,
    isProfile: false,
  };
  // return transformedUrl;
};

export const sports = [
  "Alpine skiing",
  "American Football",
  "Archery",
  "Artistic Swimming",
  "Athletics",
  "Badminton",
  "Bandy",
  "Baseball",
  "Basketball",
  "Beach volleyball",
  "Biathlon",
  "Bowling",
  "Canoeing and Kayaking",
  "Cheerleading",
  "Climbing",
  "Cricket",
  "Cross-country running",
  "Cross-Country Skiing",
  "CrossFit",
  "Curling",
  "Cycling",
  "Dance",
  "Darts",
  "Disc golf",
  "Diving",
  "E-Sports",
  "Equestrian",
  "Fencing",
  "Figure skating",
  "Finnish baseball",
  "Fitness",
  "Floorball",
  "Football",
  "Freestyle skiing",
  "Futsal",
  "Golf",
  "Gymnastics",
  "Handball",
  "Hydrox",
  "Ice hockey",
  "Lacrosse",
  "Martial arts",
  "Motorsports",
  "Nordic combined",
  "Orienteering",
  "Other",
  "Padel",
  "Pilates",
  "Polo",
  "Pool",
  "Ringette",
  "Rowing",
  "Rugby",
  "Running",
  "Sailing",
  "Shooting sport",
  "Skateboarding",
  "Ski jumping",
  "Snowboarding",
  "Squash",
  "Surfing",
  "Swimming",
  "Synchronized skating",
  "Table tennis",
  "Tennis",
  "Triathlon",
  "Volleyball",
  "Water polo",
  "Weight lifting",
  "Wellness",
  "Yoga",
];

export const winterSports = [
  "Alpine skiing",
  "Bandy",
  "Biathlon",
  "Cross-Country Skiing",
  "Curling",
  "Figure skating",
  "Freestyle skiing",
  "Ice hockey",
  "Nordic combined",
  "Ringette",
  "Ski jumping",
  "Snowboarding",
  "Synchronized skating",
];

export const summerSports = sports.filter(
  (sport) => !winterSports.includes(sport)
);

export const interestOptions = [
  {
    label: "Sports & Fitness",
    options: [
      { value: "Sports", label: "Sports" },
      { value: "Fitness", label: "Fitness" },
      { value: "Running", label: "Running" },
      { value: "Team Sports", label: "Team Sports" },
      { value: "Extreme Sports", label: "Extreme Sports" },
      { value: "Martial Arts", label: "Martial Arts" },
      { value: "Yoga", label: "Yoga" },
    ],
  },
  {
    label: "Wellbeing & Recovery",
    options: [
      { value: "Mental Wellness", label: "Mental Wellness" },
      { value: "Mindfulness", label: "Mindfulness" },
      { value: "Sleep & Recovery", label: "Sleep & Recovery" },
      { value: "Nutrition", label: "Nutrition" },
      { value: "Stress Management", label: "Stress Management" },
    ],
  },
  {
    label: "Creativity & Culture",
    options: [
      { value: "Blogging", label: "Blogging" },
      { value: "Design", label: "Design" },
      { value: "Interior Design", label: "Interior Design" },
      { value: "Knitting", label: "Knitting" },
      { value: "Painting", label: "Painting" },
      { value: "Performing Arts", label: "Performing Arts" },
      { value: "Photography", label: "Photography" },
      { value: "Podcasts", label: "Podcasts" },
      { value: "Singing", label: "Singing" },
      { value: "Stand-up Comedy", label: "Stand-up Comedy" },
      { value: "Writing", label: "Writing" },
      { value: "Books", label: "Books" },
      { value: "Movies/TV", label: "Movies/TV" },
      { value: "Music", label: "Music" },
      { value: "Fashion", label: "Fashion" },
    ],
  },
  {
    label: "Sustainable Living & Values",
    options: [
      { value: "Environment", label: "Environment" },
      { value: "Sustainable Living", label: "Sustainable Living" },
      { value: "Zero-Waste Living", label: "Zero-Waste Living" },
      { value: "Volunteering", label: "Volunteering" },
      { value: "Mentoring & Coaching", label: "Mentoring & Coaching" },
      { value: "Family", label: "Family" },
      { value: "Philosophy", label: "Philosophy" },
    ],
  },
  {
    label: "Science, Tech & Learning",
    options: [
      { value: "AI", label: "AI" },
      { value: "Astronomy", label: "Astronomy" },
      { value: "Science", label: "Science" },
      { value: "Technology", label: "Technology" },
      { value: "Virtual Reality", label: "Virtual Reality" },
      { value: "Languages", label: "Languages" },
    ],
  },
  {
    label: "Hobbies & Everyday Life",
    options: [
      { value: "Animals", label: "Animals" },
      { value: "Gardening", label: "Gardening" },
      { value: "Baking", label: "Baking" },
      { value: "Cooking", label: "Cooking" },
      { value: "DIY", label: "DIY" },
      { value: "Thrifting & Vintage", label: "Thrifting & Vintage" },
      { value: "History", label: "History" },
    ],
  },
  {
    label: "Adventure & Experiences",
    options: [
      { value: "Outdoor Activities", label: "Outdoor Activities" },
      { value: "Traveling", label: "Traveling" },
      { value: "Scuba Diving", label: "Scuba Diving" },
    ],
  },
  {
    label: "Entertainment & Digital Life",
    options: [
      { value: "Social Media", label: "Social Media" },
      { value: "Video Games", label: "Video Games" },
    ],
  },
];

export const companyInterest = [
  "Sports & Fitness",
  "Wellbeing & Recovery",
  "Creativity & Culture",
  "Sustainable Living & Values",
  "Science, Tech & Learning",
  "Hobbies & Everyday Life",
  "Adventure & Experiences",
  "Entertainment & Digital Life",
];

export const checkOptions = [
  "Just me",
  "2-10",
  "11-50",
  "51-100",
  "101-500",
  "501+",
];

/**
 * Computes whether a user's profile is completed based on their role and subRole.
 * The function checks various fields in the user object to determine if their profile is considered completed.
 *
 * @param {Object} user - The user object to check the profile completion for.
 * @param {string} user.role - The user's main role (e.g., "sports-ambassador", "brand", "fan", "admin").
 * @param {string} [user.subRole] - The user's subRole, applicable for certain roles like "athlete", "team", "influencer".
 * @param {Object} [user.athlete] - The athlete profile details (if the user is an athlete).
 * @param {Object} [user.team] - The team profile details (if the user is part of a team).
 * @param {Object} [user.influencer] - The influencer profile details (if the user is an influencer).
 * @param {Object} [user.brand] - The brand profile details (if the user is a brand).
 * @param {Object} [user.fan] - The fan profile details (if the user is a fan).
 * @param {Object} [user.admin] - The admin profile details (if the user is an admin).
 * @returns {boolean} - Returns true if the profile is considered completed, false otherwise.
 */
export const computeIsProfileCompleted = (user) => {
  const {
    role,
    subRole,
    athlete,
    team,
    influencer,
    brand,
    fan,
    admin,
    exAthlete,
    paraAthlete,
    coach,
  } = user;

  // Helper function to check if socialMedia has at least one valid link
  const hasValidSocialMedia = (socialMedia) => {
    if (!socialMedia) return false;
    return Object.values(socialMedia).some(
      (link) => typeof link === "string" && link.trim() !== ""
    );
  };

  let isProfileCompleted = false;
  if (role === "sports-ambassador") {
    if (subRole === "athlete" && athlete) {
      isProfileCompleted =
        // !!athlete.name &&
        !!athlete.gender &&
        athlete.sports?.length > 0 &&
        !!athlete.level &&
        !!athlete.location &&
        !!athlete.biography &&
        athlete.images?.length > 0 &&
        athlete.images.some((img) => !!img.url) &&
        // hasValidSocialMedia(athlete.socialMedia) &&
        athlete.interests?.length > 0;
    } else if (subRole === "ex-athlete" && exAthlete) {
      isProfileCompleted =
        // !!exAthlete.name &&
        !!exAthlete.gender &&
        exAthlete.sports?.length > 0 &&
        !!exAthlete.level &&
        !!exAthlete.location &&
        !!exAthlete.biography &&
        exAthlete.images?.length > 0 &&
        exAthlete.images.some((img) => !!img.url) &&
        // hasValidSocialMedia(exAthlete.socialMedia) &&
        exAthlete.interests?.length > 0;
    } else if (subRole === "para-athlete" && paraAthlete) {
      isProfileCompleted =
        // !!paraAthlete.name &&
        !!paraAthlete.gender &&
        paraAthlete.sports?.length > 0 &&
        !!paraAthlete.level &&
        !!paraAthlete.location &&
        !!paraAthlete.biography &&
        paraAthlete.images?.length > 0 &&
        paraAthlete.images.some((img) => !!img.url) &&
        // hasValidSocialMedia(paraAthlete.socialMedia) &&
        paraAthlete.interests?.length > 0;
    } else if (subRole === "coach" && coach) {
      isProfileCompleted =
        !!coach.gender &&
        coach.sports?.length > 0 &&
        !!coach.level &&
        !!coach.location &&
        !!coach.biography &&
        coach.images?.length > 0 &&
        coach.images.some((img) => !!img.url) &&
        // hasValidSocialMedia(coach.socialMedia) &&
        coach.interests?.length > 0;
    } else if (subRole === "team" && team) {
      isProfileCompleted =
        !!team.teamClubName &&
        team.sports?.length > 0 &&
        !!team.level &&
        !!team.location &&
        !!team.biography &&
        team.images?.length > 0 &&
        team.images.some((img) => !!img.url) &&
        // hasValidSocialMedia(team.socialMedia) &&
        team.interests?.length > 0;
    } else if (subRole === "influencer" && influencer) {
      isProfileCompleted =
        // !!influencer.name &&
        !!influencer.gender &&
        !!influencer.location &&
        !!influencer.biography &&
        influencer.images?.length > 0 &&
        influencer.images.some((img) => !!img.url) &&
        // hasValidSocialMedia(influencer.socialMedia) &&
        influencer.interests?.length > 0;
    }
  } else if (role === "brand" && brand) {
    isProfileCompleted =
      !!brand.currentJobTitle &&
      !!brand.companyName &&
      !!brand.intro &&
      brand.valuesAndInterests?.length > 0 &&
      !!brand.companyLogo &&
      !!brand.websiteUrl;
  } else if (role === "fan") {
    isProfileCompleted = true;
  } else if (role === "admin") {
    isProfileCompleted = true; // Admin profile is always completed if admin exists
  }

  return isProfileCompleted;
};

/**
 * Capitalizes the first letter of a given string.
 *
 * @param {string} str - The input string to capitalize.
 * @returns {string} The string with the first letter capitalized.
 */
export const capitalizeFirstLetter = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function toCamelCase(str) {
  if (!str) return "";
  return str?.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
}

/**
 * Verifies a JSON Web Token (JWT) and returns the decoded payload if valid.
 *
 * @param {string} token - The JWT string to verify.
 * @returns {{ valid: boolean, decoded?: object, error?: string }}
 * An object indicating whether the token is valid. If valid, includes the decoded payload.
 * If invalid, includes an error message.
 *
 * @throws {Error} If no token is provided.
 */
export const verifyToken = (token) => {
  if (!token) {
    throw new Error("Token is required");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: "Invalid or expired token" };
  }
};

/**
 * Generates a JSON Web Token (JWT) for the given user ID.
 *
 * @param {string} userId - The unique identifier of the user.
 * @returns {string|null} A signed JWT string if successful, or `null` if an error occurs.
 *
 * @throws {Error} If `userId` is not provided.
 */
export const createToken = (userId) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const payload = { userId };

  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    return token;
  } catch (error) {
    console.error("Error generating token:", error);
    return null;
  }
};
