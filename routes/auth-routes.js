const express             = require("express");
const authRoutes          = express.Router();
const passport            = require("passport");
const User                = require("../models/user");
const flash               = require("connect-flash");
const ensureLogin         = require("connect-ensure-login");
const bcrypt              = require("bcrypt");
const bcryptSalt          = 10;
const Recipe              = require('../models/recipes');
const cloudinary          = require('cloudinary');
const cloudinaryStorage   = require('multer-storage-cloudinary');
const multer              = require('multer');
const uploadCloud         = require('../config/cloudinary');


//user profile
// authRoutes.get("/user-profile", ensureLogin.ensureLoggedIn(), (req, res, next) => {
//   res.render("user-profile", { user: req.user });
 
// });


authRoutes.get("/signup", (req, res, next) => {
  res.render("signup");
});

authRoutes.post("/signup", (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username === "" || password === "") {
    res.render("signup", { message: `Please indicate username and password` });
    return;
  }

  User.findOne({ username:username }, "username", (err, user) => {
    if (user !== null) {
      res.render("signup", { 
        message: "Oops, Looks like that username already exists" 
      });
      return
    }
   
    const salt = bcrypt.genSaltSync(bcryptSalt);
    const hashPass = bcrypt.hashSync(password, salt);
      
    User.create({username:username, password:hashPass})
    .then((theUser) => {
      res.redirect('/')
    })
    .catch((err)=>{
      console.log(err);
    })
  });
});

//get login

authRoutes.get("/login", (req, res, next) => {
  res.redirect("/");
}); 
//end get login

//post login route
authRoutes.post("/user-login", passport.authenticate("local",
{
  successRedirect: "/recipes",
  failureRedirect: "/",
  failureFlash: false,
  passReqToCallback: true
}
));
// end post /login



//submit a recipe _____needs to redirect to page with all recipes
authRoutes.get("/submit-recipe", ensureLogin.ensureLoggedIn(), (req, res, next) => {
  res.render("submitRecipe", { user: req.user });
  // res.redirect("/recipes" , { user: req.user });
  // next();
});


authRoutes.post('/post/submit-recipe', uploadCloud.single('photo'), (req, res, next) => {
  Recipe.create({
    title: req.body.theTitle,
    ingredients: req.body.theIngredient.split(","),
    cuisine: req.body.theCuisine,
    duration: req.body.theDuration,
    level: req.body.level,
    dishType: req.body.dishType,
    instructions: req.body.theInstructions.split(","),
    image: req.file.url
  })
  .then((theRecipe) => {
    // res.json(theRecipe);
    // console.log(theRecipe);
    res.redirect('/recipes')
  })
  .catch((err)=>{
    console.log(err);
      next(err);
  })  
})// end post characters/create route


//All recipes
authRoutes.get("/recipes", ensureLogin.ensureLoggedIn(), (req, res, next) => {
Recipe.find()
  .then((recipes) => {
    res.render("recipes", { recipes: recipes});
    // res.json(recipes);
  })
  .catch((err)=>{
    console.log(err);
      next(err);
  })
});

// individual recipes on click
authRoutes.get("/individual-recipes/:id", ensureLogin.ensureLoggedIn(), (req, res, next) => {
  Recipe.findById(req.params.id)
    .then((recipe) => {
      console.log(recipe);
      res.render("recipes/individual-recipes", { recipe: recipe});
      // res.json(recipes);
    })
    .catch((err)=>{
      console.log(err);
        next(err);
    })
  });


  authRoutes.post("/individual-recipes/:id", ensureLogin.ensureLoggedIn(), (req, res, next) => {
    Recipe.findById()
      .then((recipe) => {
        res.render("recipes/individual-recipes", { recipe: recipe});
        // res.json(recipes);
      })
      .catch((err)=>{
        console.log(err);
          next(err);
      })
    });


// EDIT - GET ROUTE
authRoutes.get('/recipes/edit/:id', (req, res, next) => {
  const recipeID = req.params.id;
  
  // console.log(celebId);
  Recipe.findById(recipeID)
  .then(recipeFromDB => {
    
    res.render("recipes/edit-view", { recipeDetails: recipeFromDB })

  })
  
  // res.render("recipes/edit-view")
})




// deletes recipe
authRoutes.get('/recipes/delete/:id', (req, res, next) => {
  const recipeID = req.params.id;
  console.log(req.params)
  Recipe.findByIdAndRemove(recipeID)
  .then(() => {
      res.redirect("/recipes");
  })
  .catch( err => console.log(err));
})


//edit recipe POST route
authRoutes.post('/recipes/update/:id', (req, res, next) => {
  const recipeID = req.params.id;
  const editedTitle = req.body.editedTitle;
  const editedIngredient = req.body.editedIngredient;
  const editedCuisine = req.body.editedCuisine;
  const editedDuration = req.body.editedDuration;
  const editedLevel  = req.body.editedLevel;
  const editedDishType   = req.body.editedDishType;
  const editedInstructions = req.body.editedInstructions;
  // console.log("editedName: ", editedName)
  Recipe.findByIdAndUpdate(recipeID, {
      title: editedTitle,
      ingredients: editedIngredient,
      cuisine: editedCuisine,
      duration: editedDuration,
      level: editedLevel,
      dishType: editedDishType,
      instructions: editedInstructions
  })
  .then(() => {
      res.redirect('/recipes')

  })
  .catch( error => {
      console.log("Error while updating: ", error)
  })
})




// search
authRoutes.get('/recipes/search/', (req, res, next) => {
  const searchTerm = req.query.recipeSearchTerm;
  if(!searchTerm){
      res.render('recipes/no-search-view.hbs');
        return;
  }
  const searchRegex = new RegExp(searchTerm, 'i');
  Recipe.find(
      { $or:[ {'title':searchRegex}, {'ingredients':searchRegex}]},
      (err, searchResults)=>{
      if(err){
          next(err);
          return;
      }
      res.render('recipes/search-result-view.hbs',{
      results: searchResults
    });
  }
);
})




// end homepage get

//google login routes
authRoutes.get("/auth/google", passport.authenticate("google", {
  scope: ["https://www.googleapis.com/auth/plus.login",
          "https://www.googleapis.com/auth/plus.profile.emails.read"]
}));

authRoutes.get("/auth/google/callback", passport.authenticate("google", {
  failureRedirect: "/",
  successRedirect: "/user-profile"
}));


authRoutes.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

module.exports = authRoutes;