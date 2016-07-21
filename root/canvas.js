var painter = require('painter')
//var fingers = require('fingers')
var types = require('types')

module.exports = function(proto){

	proto.Turtle = require('turtle')

	proto.$composeTree = function(oldchildren){
		// it calls compose recursively
		if(this.oncompose){
			this.onflag = 1
			this.children = this.oncompose()
			this.onflag = 0
		}

		if(!Array.isArray(this.children)){
			if(!this.children) this.children = []
			else this.children = [this.children]
		}

		var children = this.children

		if(!this.initialized){
			this.initialized = true
			if(this._oninit) this._oninit()
			if(this.oninit) this.oninit()
		}

		for(var i = 0; i < children.length; i++){
			var child = children[i]
			child.parent = this
			child.root = this.root
			var oldchild = oldchildren && oldchildren[i]
			child.composeTree(oldchild && oldchild.children)
		}

		if(oldchildren) for(;i < oldchildren.length; i++){
			var oldchild = oldchildren[i]
			oldchild.destroyed = true
			if(oldchild.ondestroy) oldchild.ondestroy()
			if(oldchild._ondestroy) oldchild._ondestroy()

		}

		if(this.oncomposed) this.oncomposed()
	}

	proto.beginTurtle = function(){
		var view = this.view
		// add a turtle to the stack
		var len = ++view.$turtleStack.len
		var outer = this.turtle
		var turtle = this.turtle = view.$turtleStack[len]
		if(!turtle){
			turtle = this.turtle = view.$turtleStack[len] = new view.Turtle(view)
		}
		turtle._pickIdLo = outer._pickIdLo
		turtle.begin(outer)
		return turtle
	}

	proto.endTurtle = function(){
		// call end on a turtle and pop it off the stack
		var view = this.view
		this.turtle.end()
		// pop the stack
		var last = this.turtle
		this.turtle = view.$turtleStack[--view.$turtleStack.len]
		
		return last
	}

	proto.$moveWritten = function(start, dx, dy){
		var view = this.view
		var writes = view.$writeList
		var current = view.$turtleStack.len
		for(var i = start; i < writes.length; i += 4){
			var props = writes[i]
			var begin = writes[i+1]
			var end = writes[i+2]
			var level = writes[i+3]
			if(current > level) continue
			var slots = props.slots
			var xoff = props.xoffset
			var yoff = props.yoffset
			var array = props.self.array
			for(var j = begin; j < end; j++){
				array[j * slots + xoff] += dx
				array[j * slots + yoff] += dy
 			}
		}
	}

	// internal API used by canvas macros
	proto.$allocShader = function(classname){
		var shaders = this.$shaders
		var info = this['_' + classname].prototype.$compileInfo
		var shader = shaders[classname] = new painter.Shader(info)
		var props = shader.$props = new painter.Mesh(info.propSlots)
		props.xoffset = info.instanceProps.this_DOT_x.offset
		props.yoffset = info.instanceProps.this_DOT_y.offset
		return shader
	}

	proto.$parseColor = function(str, alpha, a, o){
		if(!types.colorFromString(str, alpha, a, o)){
			console.log("Cannot parse color "+str)
		}
	}

	proto.$parseColorPacked = function(str, alpha, a, o){
		if(!types.colorFromStringPacked(str, alpha, a, o)){
			console.log("Cannot parse color "+str)
		}
	}

	var argRx = new RegExp(/([a-zA-Z\_\$][a-zA-Z0-9\_\$]*)\s*\:\s*([^\,\}]+)/g)
	var comment1Rx = new RegExp(/\/\*[\S\s]*?\*\//g)
	var comment2Rx = new RegExp(/\/\/[^\n]*/g)
	var mainArgRx = new RegExp(/function\s*[a-zA-Z\_\$]*\s*\(([^\)]*)/)
	var macroRx = new RegExp(/([\t]*)this\.([\$][A-Z][A-Z0-9\_]*)\s*\(([^\)]*)\)/g)
	var argSplitRx = new RegExp(/[^,\s]+/g)
	var nameRx = new RegExp(/NAME/g)
	var fnnameRx = new RegExp(/^function\s*\(/)

	proto.$compileToolMacros = function(className, sourceClass){
		var sourceProto = sourceClass.prototype
		var macros = sourceProto._toolMacros
		for(var macroName in macros){
			var code = macros[macroName].toString().replace(comment1Rx,'').replace(comment2Rx,'')
			// lets parse our args
			var marg = code.match(mainArgRx)
			var mainargs = marg[1].match(argSplitRx) || []
			code = code.replace(macroRx, function(m, indent, fnname, args){
				// if args are not a {
				var macroArgs
				if(typeof args === 'string' && args.indexOf('{') !== -1){
					// lets parse args
					var res, argobj = {}
					while((res = argRx.exec(args)) !== null) {
						argobj[res[1]] = res[2]
					}
					macroArgs = [argobj]
				}
				else macroArgs = args.split(/\s*,\s*/)
				var fn = sourceProto[fnname]
				if(!fn) throw new Error('CanvasMacro: '+fnname+ ' does not exist')
				return sourceProto[fnname](className, macroArgs, mainargs, indent)
			})
			code = code.replace(nameRx,className)

			var methodName = macroName + className
			code = code.replace(fnnameRx, function(){
				return 'function '+methodName+'('
			})

			// create the function on target
			this[methodName] = new Function('return ' + code)()
		}
	}

	function defineToolGetterSetter(proto, key){
		Object.defineProperty(proto, key, {
			configurable:true,
			get:function(){
				var cls = this['_' + key]
				cls.outer = this
				return cls
			},
			set:function(prop){
				var base = this['_' + key]
				var cls = this['_' + key] = base.extend(prop)
				this.$compileToolMacros(key, cls)
			}
		})
	}

	Object.defineProperty(proto, 'tools', {
		get:function(){
			return this._tools
		},
		set:function(tools){
			if(!this.hasOwnProperty('_tools')) this._tools = this._tools?Object.create(this._tools):{}
			for(var key in tools){
				var cls =  tools[key]
				this._tools[key] = true
				this['_' + key] = cls
				defineToolGetterSetter(this, key)
				this.$compileToolMacros(key, cls)
			}	
		}
	})
}
