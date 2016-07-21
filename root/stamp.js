module.exports = require('class').extend(function Stamp(proto){
	//var types = require('types')
	require('canvas')(proto)
	
	Object.defineProperty(proto, 'props', {
		get:function(){
			throw new Error('props is a configurator, please only assign objects: this.props = {...}')
		},
		set:function(props){
			if(!this.hasOwnProperty('_props')){
				this._props = this._props?Object.create(this._props):{}
			}
			for(var key in props){
				var config = props[key]
				if(typeof config !== 'object' || Object.getPrototypeOf(config) !== Object.prototype){
					config = {value:config}
				}
				this._props[key] = config
				if(config.value !== undefined) this[key] = config.value
				//if(!config.type) config.type = types.typeFromValue(config.value)
			}
		}
	})

	proto.props = {
		x:NaN,
		y:NaN,
		w:NaN,
		h:NaN,
		margin:undefined,
		padding:undefined,
		align:undefined,
		wrap:true		
	}

	proto.$STYLESTAMP = function(classname, macroargs, mainargs, indent){
		// create / lookup stamp

		var code = ''
		code += indent + 'var $view = this.view\n\n'
		code += indent + 'var $stampId = $view.$stampId++\n'
		code += indent + 'var $stamp =  $view.$stamps[$stampId]\n\n'

		code += indent + 'if(!$stamp){\n'
		code += indent + '	$stamp = $view.$stamps[$stampId] = Object.create(this._'+classname+'.prototype)\n'
		code += indent + '	$stamp.view = $view\n'
		code += indent + '	$stamp.turtle = this.turtle\n'
		code += indent + '	$stamp.$shaders = this.$shaders.'+classname+'\n'
		code += indent + '	if(!$stamp.$shaders) $stamp.$shaders = (this.$shaders.'+classname+' = {})\n'
		code += indent + '	if($stamp.onConstruct)$stamp.onConstruct()\n'
		code += indent + '}\n'
		code += indent + '$stamp.turtle._pickIdLo = $stampId\n'
		code += indent + '$stamp.$stampArgs = '+macroargs[0]+'\n'
		code += indent + '$stamp.$outerState = this._state && this._state.'+classname+'\n'

		var stack = [
			macroargs[0],
			'this._state && this._state.'+classname, // outer state
			'$stamp._state'
		]
		
		var props = this._props

		code += indent + 'var '
		var nprops = 0
		for(var key in props){
			if(nprops++) code +=', '
			code += '_'+key
		}
		code += '\n'

		for(var i = 0; i < stack.length ; i++){
			var object = stack[i]
			var p = '$p' + i
			if(object.indexOf('.') !== -1){
				code += indent +'var '+p+' = '+ object +'\n'
			}
			else p = object
			code += indent + 'if('+p+'){\n'
			for(var key in props){
				code += indent + '	if(_'+key+' === undefined) _'+key+' = ' + p +'.' + key + '\n'
			}
			code += indent + '}\n'
		}
		for(var key in props){
			code += indent + 'if(_'+key+' !== undefined) $stamp.'+key+' = _'+key+'\n'
		}

		return code
	}

	proto.$DRAWSTAMP = function(classname, macroargs, mainargs, indent){
		var code = ''
		code += indent + '$stamp.onDraw()\n'
		return code
	}

	Object.defineProperty(proto, 'toolMacros', { 
		get:function(){
			return this._toolMacros
		},
		set:function(macros){
			if(!this.hasOwnProperty('_toolMacros')) this._toolMacros = this._toolMacros?Object.create(this._toolMacros):{}
			for(var key in macros) this._toolMacros[key] = macros[key]
		}
	})

	function deepOverlay(tgtobj, tgtkey, copyobj){
		var newobj = tgtobj[tgtkey] = tgtobj[tgtkey]?Object.create(tgtobj[tgtkey]):{}
		for(var key in copyobj){
			var value = copyobj[key]
			if(typeof value === 'object'){
				deepOverlay(newobj, key, value)
			}
			else newobj[key] = value
		}
	}

	Object.defineProperty(proto, 'states', { 
		get:function(){
			return this._states
		},
		set:function(states){
			if(!this.hasOwnProperty('_states')) this._states = this._states?Object.create(this._states):{}
			for(var key in states){
				deepOverlay(this._states, key, states[key])
			}
		}
	})

	Object.defineProperty(proto, 'state', { 
		get:function(){
			return this._state
		},
		set:function(state){
			this._state = state
			this.view.redraw()	
		}
	})
})