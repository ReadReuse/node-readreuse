const Notes = require("../schema/notesSchema");
const catchAsyncError = require("../middleware/catchAsyncError");
const statusCode = require("../constant/statusCode");
const ErrorHandler = require("../utils/errorHandler");
const User = require("../schema/userSchema");

exports.createNotes = catchAsyncError(async (req, res, next) => {
  let payload = req.body;
  if (req.user.role === "ADMIN") {
    payload = { ...payload, verified: true };
  }

  payload = { ...payload, user: req.user._id };

  const note = await Notes.create(payload);

  res.status(statusCode.SUCCESS).json({
    success: true,
    message: "Notes created successfully.",
    note,
  });
});

exports.updateNotes = catchAsyncError(async (req, res, next) => {
  const noteId = req.params.noteId;

  let note = await Notes.find({ _id: noteId, user: req.user._id });

  if (!note.length > 0)
    return next(new ErrorHandler("Notes not found", statusCode.NOT_FOUND));

  note = await Notes.findOneAndUpdate(
    { _id: noteId, user: req.user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(statusCode.SUCCESS).json({
    success: true,
    message: "Notes updated successfully",
    note,
  });
});

exports.listAllNotes = catchAsyncError(async (req, res, next) => {
  const notes = await Notes.find({ blocked: false, verified: true })
    .sort({ _id: -1 })
    .limit(req.query.limit || 20);

  let finalNotesArray = notes.map((e, i) => {
    if (req.user.savedNotes.includes(e._doc._id)) {
      return { ...e._doc, bookmarked: true };
    } else {
      return { ...e._doc, bookmarked: false };
    }
  });

  console.log(finalNotesArray);
  res.status(statusCode.SUCCESS).json({
    success: true,
    notes: finalNotesArray,
  });
});

// blocked notes admin access
exports.blockNotes = catchAsyncError(async (req, res, next) => {
  const noteId = req.params.noteId;

  const checkNotes = await Notes.findById(noteId);

  if (checkNotes === null)
    return next(new ErrorHandler("Notes not found.", statusCode.NOT_FOUND));

  const notes = await Notes.findByIdAndUpdate(
    noteId,
    { blocked: true },
    {
      new: true,
      runValidator: true,
    }
  );

  res.status(statusCode.SUCCESS).json({
    success: true,
    notes,
  });
});

// verify notes admin access
exports.verifyNotes = catchAsyncError(async (req, res, next) => {
  const notesId = req.params.noteId;

  const checkNotes = await Notes.findById(notesId);

  if (checkNotes === null)
    return next(new ErrorHandler("Notes not found.", statusCode.NOT_FOUND));

  const notes = await Notes.findByIdAndUpdate(
    notesId,
    { verified: true, blocked: false },
    {
      new: true,
      runValidator: true,
    }
  );

  res.status(statusCode.SUCCESS).json({
    success: true,
    notes,
  });
});

// get all unverified list (admin access)
exports.getUnverifiedNotesList = catchAsyncError(async (req, res, next) => {
  const note = await Notes.where({ verified: false });

  let finalNotesArray = note.map((e, i) => {
    if (req.user.savedNotes.includes(e._doc._id)) {
      return { ...e._doc, bookmarked: true };
    } else {
      return { ...e._doc, bookmarked: false };
    }
  });
  res.status(statusCode.SUCCESS).json({
    success: true,
    note: finalNotesArray,
  });
});

// delete note by admin
exports.deleteNoteByAdmin = catchAsyncError(async (req, res, next) => {
  const deletedNote = await Notes.findByIdAndDelete(req.params.noteId);

  if (deletedNote == null)
    return next(new ErrorHandler("Notes not found.", statusCode.NOT_FOUND));

  res.status(statusCode.SUCCESS).json({
    success: true,
    message: "Notes Deleted Successfully.",
  });
});

// saved and unsaved notes
exports.bookmarkNote = catchAsyncError(async (req, res, next) => {
  const checkForSaved = await User.find({
    _id: req.user._id,
    savedNotes: { $elemMatch: { $eq: req.params.noteId } },
  });
  let isSaved;
  let note;
  if (!checkForSaved.length > 0) {
    note = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: { savedNotes: req.params.noteId },
      },
      { new: true, runValidators: true }
    );
    isSaved = true;
  } else {
    note = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { savedNotes: req.params.noteId },
      },
      { new: true, runValidators: true }
    );
    isSaved = false;
  }

  res.status(statusCode.SUCCESS).json({
    success: true,
    isSaved,
  });
});

exports.searchNotesController = catchAsyncError(async (req, res, next) => {
  const search = await Notes.find({
    $or: [
      { title: { $regex: req.query.searchString, $options: "i" } },
      { tags: { $in: [req.query.searchString] } },
    ],
  });

  if (!search.length > 0)
    return next(new ErrorHandler("Notes not found", statusCode.NOT_FOUND));

  let finalNotesArray = search.map((e, i) => {
    if (req.user.savedNotes.includes(e._doc._id)) {
      return { ...e._doc, bookmarked: true };
    } else {
      return { ...e._doc, bookmarked: false };
    }
  });

  res.status(statusCode.SUCCESS).json({
    success: true,
    notes: finalNotesArray,
  });
});

exports.getNotesBasedOnGraduation = catchAsyncError(async (req, res, next) => {
  const { graduationYear, graduationSemester, course, branch } = req.query;
  const search = await Notes.find({
    $or: [
      { graduationYear: graduationYear },
      { graduationSemester: graduationSemester },
      { course: { $regex: course, $options: "i" } },
      { branch: { $regex: branch, $options: "i" } },
    ],
  });

  if (!search.length > 0)
    return next(new ErrorHandler("Notes not found", statusCode.NOT_FOUND));

  let finalNotesArray = search.map((e, i) => {
    if (req.user.savedNotes.includes(e._doc._id)) {
      return { ...e._doc, bookmarked: true };
    } else {
      return { ...e._doc, bookmarked: false };
    }
  });

  res.status(statusCode.SUCCESS).json({
    success: true,
    notes: finalNotesArray,
  });
});
// { description: { $regex: req.query.searchString, $options: "i" } },
// {
//   keyPoint: { $in: [/[req.query.searchString]/] },
// },
