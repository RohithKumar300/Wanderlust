const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({ path: "reviews", populate: { path: "author", }, }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        req.session.save(() => {
            res.redirect("/listings");
        });
    } else {
        console.log(listing);
        res.render("listings/show.ejs", { listing });
    }
};

module.exports.createListing = async (req, res, next) => {

    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
    })
    .send();

    let url = req.file.url;
    let filename = req.file.public_id;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    newListing.geometry = response.body.features[0].geometry;

    let savedListing = await newListing.save();
    console.log(savedListing);
    req.flash("success", "New Listing Created!");
    req.session.save(() => {
        res.redirect("/listings");
    });
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    } else {
        let originalImageUrl = listing.image.url;
        originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250"); 
        res.render("listings/edit.ejs", { listing, originalImageUrl });
    }
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (typeof req.file !== "undefined") {
        let url = req.file.url
        let filename = req.file.public_id;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing Updated!");
    req.session.save(() => {
        res.redirect(`/listings/${id}`);
    });
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    req.session.save(() => {
        res.redirect("/listings");
    });
};

module.exports.searchListings = async (req, res) => {
    let searchQuery = req.query.search;
    let allListings = await Listing.find({location: searchQuery});
    if(!allListings || allListings.length === 0) {
        req.flash("error", "No listings found for the searched location!");
        return req.session.save(() => {
            res.redirect("/listings");
        });
    }
    res.render("listings/index.ejs", { allListings });
};