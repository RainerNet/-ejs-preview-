


HHH = {};
HHH.Data = {};
///URL


//Object Methods

HHH.LoadGame = function(){
	HHH.PopulatePage(1);	
}

HHH.OptionClick = function(){
	var nextQuestionID = $(this).id().split("_")[1];
	
}


HHH.GetData = function(){
	$.ajax({
		url: "http://izzycjohnston.com/gdihhh/php/cit_json.php",
		dataType: "json",
		crossDomain: "true",
		success: function(data){
			HHH.Data = data;
			console.log(data);
			HHH.LoadGame();
		}
	}) 
}();



//Page Utils

HHH.MouseOverQuestion = function(){

	$("#question").children("button").mouseover(function()
	{
		$(this).toggleClass("highlight");
	});
}

HHH.MouseOverMenu = function(){

	$(".heading").children("button").mouseover(function()
	{
		$(this).toggleClass("menu-highlight");
	});
}

HHH.Transition = function(){
//Transition animation
	$(".photo").fadeOut();
	$(".photo").attr("src", "new url");
	$(".photo").fadeIn();
}


HHH.PopulatePage = function(questionID){
	HHH.LoadQuestion(questionID);
	HHH.LoadOptions(questionID);
	HHH.LoadFact(questionID);
}


HHH.LoadQuestion = function(questionID){
	var question = jlinq.from(HHH.Data.questions)
	.equals("ID", questionID)
	.select();
	$("#question").val('<div class="inside clearfix"><p class="large heading">' + question.question_heading + "</p><p>" + question.content + "</p></div>");
}

HHH.LoadOptions = function(questionID){
	var options = jlinq.from(HHH.Data.op