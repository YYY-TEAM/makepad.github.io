
var reservedWords = require('./jsidentifier').reservedWords
var keywords = require('./jsidentifier').keywords
var tt = require('./jstokentype').types
var lineBreak = require('./jswhitespace').lineBreak
var getOptions = require('./jsoptions').getOptions

// Registered plugins
var plugins = exports.plugins = {}

function keywordRegexp(words) {
	return new RegExp("^(" + words.replace(/ /g, "|") + ")$")
}

exports.Parser = function Parser(options, input, startPos) {
	this.options = options = getOptions(options)
	this.sourceFile = options.sourceFile
	this.keywords = keywordRegexp(keywords[options.ecmaVersion >= 6 ? 6 : 5])
	var reserved = options.allowReserved ? "" :
			reservedWords[options.ecmaVersion] + (options.sourceType == "module" ? " await" : "")
	this.reservedWords = keywordRegexp(reserved)
	var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict
	this.reservedWordsStrict = keywordRegexp(reservedStrict)
	this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + reservedWords.strictBind)
	this.input = String(input)

	// Used to signal to callers of `readWord1` whether the word
	// contained any escape sequences. This is needed because words with
	// escape sequences must not be interpreted as keywords.
	this.containsEsc = false

	// Load plugins
	this.loadPlugins(options.plugins)

	// Set up token state

	// The current position of the tokenizer in the input.
	if (startPos) {
		this.pos = startPos
		this.lineStart = Math.max(0, this.input.lastIndexOf("\n", startPos))
		this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length
	} else {
		this.pos = this.lineStart = 0
		this.curLine = 1
	}

	// Properties of the current token:
	// Its type
	this.type = tt.eof
	// For tokens that include more information than their type, the value
	this.value = null
	// Its start and end offset
	this.start = this.end = this.pos
	// And, if locations are used, the {line, column} object

	// Position information for the previous token
	this.lastTokStart = this.lastTokEnd = this.pos

	// The context stack is used to superficially track syntactic
	// context to predict whether a regular expression is allowed in a
	// given position.
	this.context = this.initialContext()
	this.exprAllowed = true

	// Figure out if it's a module code.
	this.strict = this.inModule = options.sourceType === "module"

	// Used to signify the start of a potential arrow function
	this.potentialArrowAt = -1

	// Flags to track whether we are in a function, a generator.
	this.inFunction = this.inGenerator = false
	// Labels in scope.
	this.labels = []

	// stored comment array
	this.storeComments = options.storeComments
	this.insertCommas = options.insertCommas
	// If enabled, skip leading hashbang line.
	if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === '#!')
		this.skipLineComment(2)
}

function ParserPrototype(){
	// DEPRECATED Kept for backwards compatibility until 3.0 in case a plugin uses them
	this.isKeyword = function(word) { return this.keywords.test(word) }
	this.isReservedWord = function(word) { return this.reservedWords.test(word) }

	this.extend = function(name, f) {
		this[name] = f(this[name])
	}

	this.loadPlugins = function(pluginConfigs) {
		for (var name in pluginConfigs) {
			var plugin = plugins[name]
			if (!plugin) throw new Error("Plugin '" + name + "' not found")
			plugin(this, pluginConfigs[name])
		}
	}

	this.parse = function() {
		var node = this.options.program || this.startNode()
		this.nextToken()
		return this.parseTopLevel(node)
	}
}
ParserPrototype.call(exports.Parser.prototype)
