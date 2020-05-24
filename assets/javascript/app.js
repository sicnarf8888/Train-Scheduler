
// ----------------- INITIALIZATIONS AND GLOBAL VARIABLE DECLARATIONS ---------------------

const FIREBASECONFIG = {

	apiKey: "AIzaSyCXWHtAs_s0jvXrRVLALRaJrBVBE74T2Qo",
	authDomain: "train-scheduler-3be3a.firebaseapp.com",
	databaseURL: "https://train-scheduler-3be3a.firebaseio.com",
	projectId: "train-scheduler-3be3a",
	storageBucket: "train-scheduler-3be3a.appspot.com",
	messagingSenderId: "852035740313",
	appId: "1:852035740313:web:bc9d8461fba0e205754e08",
	
};

// Initialize APP to use firebase

firebase.initializeApp(FIREBASECONFIG);


const database = firebase.database().ref("train");
const schedule = database.child("schedules");

const tMinutesTillTrain = 0;

// ---------------------- FUNCTIONS ----------------------


// Updates time every 60 seconds
function setCurrentTime() {
  $("#current-time").html(moment().format("hh:mm:ss A"));
}

// Run once so that when page loads, time will be displayed immediately
setCurrentTime();

// Run again, this time with interval every 1 second
setInterval(function(){
  setCurrentTime();
}, 1000);

//Click event for the submit button. When user clicks Submit button to add a train to the schedule...
$("#submit-button").on("click", function () {
  // Prevent form from submitting
  event.preventDefault();

  // Reset all errors before continue
  resetErrors();

  //Grab the values that the user enters in the text boxes in the "Add train" section. Store the values in variables.
  const trainName = $("#train-name").val().trim();
  const destination = $("#destination").val().trim();
  const firstTrainTime = $("#first-train-time").val().trim();
  const trainFrequency = $("#frequency").val().trim();

  //Form validation for user input values. To add a train, all fields are required.
  //Check that all fields are filled out.

  // By using ARRAYS, we can simply check for errors that are common to all the variables such as validating empty values
  // '.includes' will check for a value inside an array, if not found, will return FALSE.

  let hasError = [
    trainName,
    destination,
    firstTrainTime,
    trainFrequency,
  ].includes("");

  // "if(hasError)" means if the value of "hasError" is true
  if (hasError) {
    $("#missing-field").html(
      "ALL fields are required to add a train to the schedule."
    );

    // "return;" means returning a NULL value
    // We return a null value so that it won't continue pass this "If statement"
    return;
  }

	// Use MOMENT.JS to validate 24Hour format
	
  if (!moment(firstTrainTime, "HH:mm", true).isValid()) {
    $("#not-military-time").html(
      "Time must be in military format: HH:mm. For example, 15:00."
    );

    // NOTE: We didn't return null here since we wanted all the errors on the fields to appear
    // making the users know what fields should be corrected.
    hasError = true;
  }

  // Check if the trainFrequency is not a number

  if (isNaN(trainFrequency)) {
    $("#not-a-number").html("Not a number. Enter a number (in minutes).");

    
    // making the users know what fields should be corrected.
    hasError = true;
  }

  // If "hasError" is True, we won't let the code continue to the next line
 
  if (hasError) {
    return;
  }

  //Moment JS math caculations to determine train next arrival time and the number of minutes away from destination.
  // First Time (pushed back 1 year to make sure it comes before current time)
  const firstTimeConverted = moment(firstTrainTime, "HH:mm").subtract(
    1,
    "years"
  );

  // Difference between the times

  const diffTime = moment().diff(moment(firstTimeConverted), "minutes");

  // Time apart (remainder)
  const tRemainder = diffTime % trainFrequency;

  // Minute Until Train
  const tMinutesTillTrain = trainFrequency - tRemainder;

  // Next Train
  const nextTrain = moment()
    .add(tMinutesTillTrain, "minutes")
    .format("hh:mm A");

  //Create local temporary object for holding train data
  const newTrain = {
    trainId: moment().format("YYYYMMDDHHmmss").toString(),
    trainName: trainName,
    destination: destination,
    firstTrainTime: firstTrainTime,
    trainFrequency: trainFrequency,
    nextTrain: nextTrain,
    tMinutesTillTrain: tMinutesTillTrain.toString(),
    currentTime: moment().format("HH:mm A"),
  };

  //Log everything to console for debugging purposes.
  console.log("newTrain data: ");
  console.log(newTrain);

  // Saves the new schedule to the Firebase database.
  // We put the new value as { [newTrain.trainId]: newTrain } so that we can
  // get the new schedule by Id from the database (ie: train/schedule/1234556)

  schedule.update({ [newTrain.trainId]: newTrain }).then(function(){
    // When the saving of the update is successfuly, "then" will run as a side-effect
    //Confirmation modal that appears when user submits form and train is added successfully to the schedule.
    $(".add-train-modal").html(
      "<p>" +
        newTrain.trainName +
        " was successfully added to the current schedule."
    );
    $("#addTrain").modal();
  });
});

// This function resets all errors
function resetErrors() {
  $("#not-military-time").empty();
  $("#missing-field").empty();
  $("#not-a-number").empty();
  $("#missing-field").empty();
}

function deleteSchedule(trainId) {
  // We get first the trainSchedule via referencing the trainId
  // Then we call remove() to remove it from the database
  database.child('schedules/' + trainId).remove();
}

// database.on('value') will listen to all the database changes from Firebase
// This refreshes everytime you add or remove a value from the database
database.on('value', function(childSnapshot, prevChildKey) {
  $("#schedule-body").empty();

  const allTrainData = childSnapshot.val()['schedules'];
  console.log(allTrainData);
  Object.keys(allTrainData).forEach(function(trainId) {
    updateSchedule(allTrainData[trainId]);
  });
})

// updateSchedule will add a new row to the table in the HTML
function updateSchedule(newSchedule) {
  const trainTd = $("<td>").text(newSchedule.trainName);
  const destTd = $("<td>").text(newSchedule.destination);
  const nextTrainTd = $("<td>").text(newSchedule.nextTrain);
  const trainFrequencyTd = $("<td>").text(newSchedule.trainFrequency);
  const tMinutesTillTrainTd = $("<td>").text(newSchedule.tMinutesTillTrain);

  // We have to add actions first before appending to the HTML since registering
  // an action to the DOM is manually done.
  // If we won't do it, delete button would not be able to trigger this click event
  const deleteBtn = $("<button>&#x274C;</button>")
    .addClass("btn btn-sm")
    .on("click", function(){
      // To pass the trainId to the deleteSchedule button, we have to update
      // #remove-train-btn click event

      $("#remove-train-btn").on("click", function() {
        deleteSchedule(newSchedule.trainId);
      });

      // Shows removeTrain modal
      $("#removeTrain").modal();
    });
  const deleteTd = $("<td>").append(deleteBtn);

  const newRow = $("<tr>").attr("id", newSchedule.trainId);

  newRow.append(trainTd);
  newRow.append(destTd);
  newRow.append(trainFrequencyTd);
  newRow.append(nextTrainTd);
  newRow.append(tMinutesTillTrainTd);
  newRow.append(deleteTd);

  $("#schedule-body").append(newRow);
}
