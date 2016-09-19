
var gl, myFbo;
var canvas;
var program, programFBO;
var myphi = 0, zeta = 30, radius = 15, fovy = Math.PI/10;
var rotationmask = 0;;

var OFFSCREEN_WIDTH = 1024, OFFSCREEN_HEIGHT = 1024;

var scene = {};

function getWebGLContext() {
    
    canvas = document.getElementById("myCanvas");
    
    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    
    for (var i = 0; i < names.length; ++i) {
	try {
	    return canvas.getContext(names[i]);
	}
	catch(e) {
	}
    }
    
    return null;
    
}

function initProgram(vertexShaderName, fragmentShaderName) {

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, document.getElementById(vertexShaderName).text);
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, document.getElementById(fragmentShaderName).text);
    gl.compileShader(fragmentShader);
    
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    
    gl.linkProgram(program);
    
    program.vertexPositionAttribute = gl.getAttribLocation(program, "VertexPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);

    return program;
}

function initShaders() {
    
    // Shader para pintar en el FBO ---------------------------------------------------
    programFBO = initProgram("myVertexShaderFBO", "myFragmentShaderFBO");
    programFBO.projectionModelViewMatrixIndex = gl.getUniformLocation( programFBO, "projectionModelViewMatrix");

    // Shader para pintar la escena ---------------------------------------------------
    program = initProgram("myVertexShader", "myFragmentShader");
    program.modelViewMatrixIndex                 = gl.getUniformLocation( program, "modelViewMatrix");
    program.projectionMatrixIndex                = gl.getUniformLocation( program, "projectionMatrix");
    program.projectionModelViewMatrixLightIndex  = gl.getUniformLocation( program, "projectionModelViewMatrixLight");
    
    // normales
    program.vertexNormalAttribute = gl.getAttribLocation ( program, "VertexNormal");
    program.normalMatrixIndex     = gl.getUniformLocation( program, "normalMatrix");
    
    // texturas
    program.vertexTexcoordsAttribute = gl.getAttribLocation ( program, "VertexTexcoords");
    program.repetition               = gl.getUniformLocation( program, "repetition");
    program.textureIndex             = gl.getUniformLocation(program, 'myTexture');
	program.AlphamapIndex = gl.getUniformLocation(program, 'alphaMap');

    // material
    program.KaIndex    = gl.getUniformLocation( program, "Material.Ka");
    program.KdIndex    = gl.getUniformLocation( program, "Material.Kd");
    program.KsIndex    = gl.getUniformLocation( program, "Material.Ks");
    program.alphaIndex = gl.getUniformLocation( program, "Material.alpha");
    
    // fuente de luz
    program.LaIndex       = gl.getUniformLocation( program, "Light.La");
    program.LdIndex       = gl.getUniformLocation( program, "Light.Ld");
    program.LsIndex       = gl.getUniformLocation( program, "Light.Ls");
    program.PositionIndex = gl.getUniformLocation( program, "Light.Position");
    
    // sombras
    program.textureShadowIndex = gl.getUniformLocation( program, "myTextureShadow");

    gl.useProgram(program);

    gl.uniform1i(program.textureShadowIndex, 0); 

}

function initRendering() {
    
    gl.enable(gl.DEPTH_TEST);

    setLight();

}

function initBuffers(model) {
    
    model.idBufferVertices = gl.createBuffer ();
    gl.bindBuffer (gl.ARRAY_BUFFER, model.idBufferVertices);
    gl.bufferData (gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    
    model.idBufferIndices = gl.createBuffer ();
    gl.bindBuffer (gl.ELEMENT_ARRAY_BUFFER, model.idBufferIndices);
    gl.bufferData (gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
    
}

function initPrimitives() {
    
    initBuffers(examplePlane);
    initBuffers(exampleCube);
    initBuffers(exampleCone);
    initBuffers(exampleCylinder);
    initBuffers(exampleSphere);

}

function setProjection() {
    
    var projectionMatrix  = mat4.create();
    mat4.perspective(projectionMatrix, fovy, 1, 3.0, 80.0);
    
    gl.uniformMatrix4fv(program.projectionMatrixIndex, false, projectionMatrix);
    
}

function getCameraMatrix() {
    
    var _phi  = myphi * Math.PI / 180.0;
    var _zeta = zeta  * Math.PI / 180.0;
    var x = 0, y = 0, z = 0;
    z = radius * Math.cos(_zeta) * Math.cos(_phi);
    x = radius * Math.cos(_zeta) * Math.sin(_phi);
    y = radius * Math.sin(_zeta);
    
    var cameraMatrix = mat4.create();
    mat4.lookAt(cameraMatrix, [x, y, z], [0, 0, 0], [0, 1, 0]);
    
    return cameraMatrix;
    
}

function getCameraMatrixFromLight() { // camara en la fuente de luz
    
    var cameraMatrixFromLight = mat4.create();
    
    mat4.lookAt(cameraMatrixFromLight, [2, 5, -15], [0, -0.5, -radius], [0, 1, 0]);
    
    return cameraMatrixFromLight;

}

function getModelViewMatrix(modelMatrix) {

    var modelViewMatrix = mat4.create();

    mat4.multiply(modelViewMatrix, scene.cameraMatrix, modelMatrix);

    return modelViewMatrix;

}

function getNormalMatrix(modelViewMatrix) {
    
    var normalMatrix = mat3.create();
    
    mat3.fromMat4  (normalMatrix, modelViewMatrix);
    mat3.invert    (normalMatrix, normalMatrix);
    mat3.transpose (normalMatrix, normalMatrix);

    return normalMatrix;
    
}

function getProjectionModelViewMatrixLight(modelViewMatrix) {

    var projectionMatrixFromLight  = mat4.create();
    mat4.perspective (projectionMatrixFromLight, Math.PI/3.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0);

    var projectionModelViewMatrixLight = mat4.create();
    mat4.multiply(projectionModelViewMatrixLight, scene.cameraMatrixFromLight, modelViewMatrix);
    mat4.multiply(projectionModelViewMatrixLight, projectionMatrixFromLight, projectionModelViewMatrixLight);

    return projectionModelViewMatrixLight;

}

function setViews(object) {

    object.modelViewMatrix                = getModelViewMatrix(object.modelMatrix);
    object.normalMatrix                   = getNormalMatrix(object.modelViewMatrix);
    object.projectionModelViewMatrixLight = getProjectionModelViewMatrixLight(object.modelViewMatrix);

}

function setMaterial(material) {
    
    gl.uniform3fv(program.KaIndex,    material.mat_ambient);
    gl.uniform3fv(program.KdIndex,    material.mat_diffuse);
    gl.uniform3fv(program.KsIndex,    material.mat_specular);
    gl.uniform1f (program.alphaIndex, material.alpha);
    
}

function setTexture(textureIndex) {

    gl.uniform1i(program.textureIndex, textureIndex);
    gl.uniform1f(program.repetition, 1.0);

}

function setLight() {
    
    gl.uniform3f(program.LaIndex,       1.0, 1.0, 1.0);
    gl.uniform3f(program.LdIndex,       1.0, 1.0, 1.0);
    gl.uniform3f(program.LsIndex,       1.0, 1.0, 1.0);
    gl.uniform3f(program.PositionIndex, 5.0, 5.0, -15.0);
    
}
function setAlpha(AlphamapIndex) {

    gl.uniform1i(program.AlphamapIndex, AlphamapIndex);

}
function createTransformedObject(primitive, transformationFunction, material, texture, alpha) {

    var object = {
	"primitive"   : primitive,
	"modelMatrix" : mat4.create(),
	"material"    : material,
        "texture"     : texture,
		"alpha"       : alpha
    };
    mat4.identity(object.modelMatrix);
    transformationFunction(object.modelMatrix);
    
    setViews(object);

    return object;
    
}

function drawScene() {

    scene.cameraMatrix          = getCameraMatrix();
    scene.cameraMatrixFromLight = getCameraMatrixFromLight(); // Calculamos ambas matrices una sola vez por cada llamada a drawScene
    scene.objects = [
	createTransformedObject(examplePlane,
							function(modelMatrix) {
												mat4.translate(modelMatrix, modelMatrix, [0,-0.86,0]);
																	mat4.scale(modelMatrix, modelMatrix, [10, 0, 10]);
																		},
																		Chrome,
																		1,
																		6
																		)

    ];
//MASCARA
	scene.objects[scene.objects.length] =  createTransformedObject(exampleSphere,
								function(modelMatrix) {
									mat4.translate(modelMatrix, modelMatrix, [0,0.26,0]);
									mat4.scale(modelMatrix, modelMatrix, [0.3, 0.3, 0.3]);
									mat4.rotate(modelMatrix, modelMatrix, rotationmask, [0, 1, 0]);

									},
									Gold,
									2, 
									7
									);
	
//BASES DE LA MASCARA
		scene.objects[scene.objects.length] = createTransformedObject(exampleCylinder,
																	 function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [0,-0.86,0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.4, 0.4]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [-1, 0, 0]);
																		},
																		Gold,
																		4,
																		8
																		);
		scene.objects[scene.objects.length] = createTransformedObject(exampleCone,
																	 function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [0,-0.46,0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.01, 0.4]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [-1, 0, 0]);
																		},
																		Gold,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCylinder,
																	 function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [0,-0.46,0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.3, 0.3, 0.3]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [-1, 0, 0]);
																		},
																		Gold,
																		4,
																		8
																		);
		scene.objects[scene.objects.length] = createTransformedObject(exampleCone,
																	 function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [0,-0.16,0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.3, 0.01, 0.3]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [-1, 0, 0]);
																		},
																		Gold,
																		4,
																		8
																		);
																		
//PILAR 1 
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,-0.65,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.4, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,-0.43,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,-0.2,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.3, 0.4, 0.3]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.01, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCylinder,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0.81,1.0]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [1, 0, 0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.2, 0.2, 0.8]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0.84,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0.97,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.2, 0.4]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,1.1,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	
	//2º pilar
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,-0.65,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.4, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,-0.43,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,-0.2,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.3, 0.4, 0.3]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.01, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCylinder,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0.81,1.0]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [1, 0, 0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.2, 0.2, 0.8]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0.84,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0.97,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.2, 0.4]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,1.1,1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	//3º pilar
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,-0.65,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.4, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,-0.43,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,-0.2,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.3, 0.4, 0.3]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.01, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCylinder,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0.81,-1.0]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [1, 0, 0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.2, 0.2, 0.8]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0.84,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,0.97,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.2, 0.4]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [-1.0,1.1,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	//4º pilar
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,-0.65,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.4, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,-0.43,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,-0.2,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.3, 0.4, 0.3]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.01, 0.4]);

																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCylinder,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0.81,-1.0]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [1, 0, 0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.2, 0.2, 0.8]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0.84,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,0.97,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.4, 0.2, 0.4]);
																		},
																		Ruby,
																		4,
																		8
																		);
	scene.objects[scene.objects.length] = createTransformedObject(exampleCube,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [1.0,1.1,-1.0]);
																		mat4.scale(modelMatrix, modelMatrix, [0.5, 0.05, 0.5]);
																		},
																		Ruby,
																		4,
																		8
																		);
//TEJADO
scene.objects[scene.objects.length] = createTransformedObject(exampleCone,
														function(modelMatrix) {
																		mat4.translate(modelMatrix, modelMatrix, [0,1.1,0]);
																		mat4.scale(modelMatrix, modelMatrix, [1.76, 2, 1.76]);
																		mat4.rotate(modelMatrix, modelMatrix, Math.PI/2, [-1, 0, 0]);
																		},
																		Ruby,
																		3,
																		8
																	);
																		//TECHO																	
scene.objects[scene.objects.length] = 	createTransformedObject(examplePlane,
				function(modelMatrix) {
				   mat4.translate(modelMatrix, modelMatrix, [0,1.1,0]);
				   mat4.scale(modelMatrix, modelMatrix, [4, 0, 4]);
				},
				Chrome,
				5,
				6
			       );

    
    
    // Primero la escena desde la fuente de luz
    drawAllObjectsFromLight();
    
    // Ahora la escena desde la cámara del usuario
    drawAllObjects();

}

function drawAllObjectsFromLight() {

    gl.bindFramebuffer (gl.FRAMEBUFFER, myFbo);                     // Change the drawing destination to FBO
    gl.viewport        (0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT);  // Set viewport for FBO
    gl.clearColor      (1.0, 1.0, 1.0, 1.0);                        // El blanco equivale a la maxima profundidad
    gl.clear           (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear FBO
    
    gl.useProgram(programFBO);

    for (var i = 0; i < scene.objects.length; i++)
	drawObjectFromLight(scene.objects[i]);

}

function drawObjectFromLight(object) {
    
    gl.uniformMatrix4fv(programFBO.projectionModelViewMatrixIndex, false, object.projectionModelViewMatrixLight);

    drawPrimitiveFromLight(object.primitive);
    
}

function drawPrimitiveFromLight(primitive) {
    
    gl.bindBuffer (gl.ARRAY_BUFFER, primitive.idBufferVertices);
    gl.vertexAttribPointer (programFBO.vertexPositionAttribute,  3, gl.FLOAT, false, 8*4,   0);
    
    gl.bindBuffer   (gl.ELEMENT_ARRAY_BUFFER, primitive.idBufferIndices);
    gl.drawElements (gl.TRIANGLES, primitive.indices.length, gl.UNSIGNED_SHORT, 0);
    
}

function drawAllObjects() {

    gl.bindFramebuffer (gl.FRAMEBUFFER, null);                      // Change the drawing destination to color buffer
    gl.viewport        (0, 0, 800, 800);
    gl.clearColor      (0.75, 0.75, 0.75, 1.0);
    gl.clear           (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffer
    
    gl.useProgram(program);

    gl.enableVertexAttribArray(program.vertexPositionAttribute);
    gl.enableVertexAttribArray(program.vertexNormalAttribute);
    gl.enableVertexAttribArray(program.vertexTexcoordsAttribute);
    
    setProjection();
    
    setMaterial(scene.objects[0].material);
    drawObject(scene.objects[0]);
    
    for (var i = 1; i < scene.objects.length; i++) {
	setMaterial(scene.objects[i].material);
	drawObject(scene.objects[i]);
    }

}

function drawObject(object) {
    
    gl.uniformMatrix3fv(program.normalMatrixIndex, false, object.normalMatrix);
    gl.uniformMatrix4fv(program.modelViewMatrixIndex, false, object.modelViewMatrix);
    gl.uniformMatrix4fv(program.projectionModelViewMatrixLightIndex, false, object.projectionModelViewMatrixLight);
    
    setTexture(object.texture);
	setAlpha(object.alpha);
    drawPrimitive(object.primitive);

}

function drawPrimitive(primitive) {
    
    gl.bindBuffer (gl.ARRAY_BUFFER, primitive.idBufferVertices);
    gl.vertexAttribPointer (program.vertexPositionAttribute,  3, gl.FLOAT, false, 8*4,   0);
    gl.vertexAttribPointer (program.vertexNormalAttribute,    3, gl.FLOAT, false, 8*4, 3*4);
    gl.vertexAttribPointer (program.vertexTexcoordsAttribute, 2, gl.FLOAT, false, 8*4, 6*4);
    
    gl.bindBuffer   (gl.ELEMENT_ARRAY_BUFFER, primitive.idBufferIndices);
    gl.drawElements (gl.TRIANGLES, primitive.indices.length, gl.UNSIGNED_SHORT, 0);
    
}


function initHandlers() {
    
    var mouseDown = false;
    var lastMouseX;
    var lastMouseY;
    
    canvas.addEventListener("mousedown",
                            function(event) {
				mouseDown  = true;
				lastMouseX = event.clientX;
				lastMouseY = event.clientY;
                            },
                            false);
    
    canvas.addEventListener("mouseup",
                            function() {
				mouseDown = false;
                            },
                            false);
    
    canvas.addEventListener("mousemove",
                            function (event) {
				if (!mouseDown) {
				    return;
				}
				var newX = event.clientX;
				var newY = event.clientY;
				if (event.shiftKey == 1) {
				    if (event.altKey == 1) {              // fovy
					fovy -= (newY - lastMouseY) / 100.0;
					if (fovy < 0.001) {
					    fovy = 0.1;
					}
				    } else {                              // radius
					radius -= (newY - lastMouseY) / 10.0;
					if (radius < 0.01) {
					    radius = 0.01;
					}
				    }
				} else {                               // position
				    myphi -= (newX - lastMouseX);
				    zeta  += (newY - lastMouseY);
				    if (zeta < -80) {
					zeta = -80.0;
				    }
				    if (zeta > 80) {
					zeta = 80;
				    }
				}
				lastMouseX = newX
				lastMouseY = newY;
				requestAnimationFrame(drawScene);
                            },
                            false);
	/*for (var i = 0; i < 5; i++) {
	textureFilename[i].addEventListener("change",
					    loadImageInTextureHandler(i+1),
					    false);
    }
    function loadImageInTextureHandler(i) {
	return function(){
	    loadImageInTexture(this.files[0], i);
	};
}
    for (var j = 5; j < 9; j++) {
	textureFilename[j].addEventListener("change",
					    loadAlphaInTextureHandler(j+1),
					    false);
    }
    function loadAlphaInTextureHandler(j) {
	return function(){
	    loadAlphaInTexture(this.files[0], j);
	};
    }*/
}

function initFramebufferObject() {
    
    // Create a texture object and set its size and parameters
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture  (gl.TEXTURE_2D, texture);
    gl.texImage2D   (gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT,
                     0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
    
    // Create a renderbuffer object and Set its size and parameters
    var depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
    
    // Create a framebuffer object (FBO)
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer        (gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D   (gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    myFbo = framebuffer;
    
}

function isPowerOfTwo(x) {

    return (x & (x - 1)) == 0;

}

function nextHighestPowerOfTwo(x) {

    --x;
    for (var i = 1; i < 32; i <<= 1) {
	x = x | x >> i;
    }
    return x + 1;

}
function loadAlphaInTexture(file, textureUnit) {
var texture = gl.createTexture();
	gl.uniform1i(program.AlphamapIndex, textureUnit);

    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

	var reader = new FileReader(); // Evita que Chrome se queje de SecurityError al cargar la imagen elegida por el usuario
    reader.addEventListener("load",
			    function() {
				var image = new Image();
				image.addEventListener("load",
						        function() {
							    loadAlpha(image, textureUnit);
							    requestAnimationFrame(drawScene);
						        },
						        false);
				image.src = reader.result;
			    },
			    false);
    reader.readAsDataURL(file);
}
function loadImageInTexture(file, textureUnit) {
	var texture = gl.createTexture();
	    gl.uniform1i(program.textureIndex, textureUnit);

    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    var reader = new FileReader(); // Evita que Chrome se queje de SecurityError al cargar la imagen elegida por el usuario
    reader.addEventListener("load",
			    function() {
				var image = new Image();
				image.addEventListener("load",
						        function() {
							    loadTexture(image, textureUnit);
							    requestAnimationFrame(drawScene);
						        },
						        false);
				image.src = reader.result;
			    },
			    false);
    reader.readAsDataURL(file);

}
function loadTexture(image, textureUnit) {
    
    gl.activeTexture(gl.TEXTURE0 + textureUnit);

    if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
	// Scale up the texture to the next highest power of two dimensions.
	var canvas    = document.createElement("canvas");
	canvas.width  = nextHighestPowerOfTwo(image.width);
	canvas.height = nextHighestPowerOfTwo(image.height);
	var ctx       = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	image = canvas;
    }
    gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);

}

function initTexture(url, textureUnit) {
    
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var image = new Image();
    image.addEventListener("load",
			   function() {
			       loadTexture(image, textureUnit);
			       requestAnimationFrame(drawScene);
			   },
			   false);
    image.addEventListener("error",
			   function(err) {
			       console.log("MALA SUERTE: no está disponible " + this.src);
			       requestAnimationFrame(drawScene);
			   },
			   false);
    image.crossOrigin = 'anonymous'; // Esto y el uso de corproxy en la URL evita que Chrome se queje de SecurityError al cargar la imagen de otro dominio
    image.src = url;

}
function loadAlpha(image, textureUnit) {
	gl.uniform1i(program.AlphamapIndex, textureUnit);

	gl.activeTexture(gl.TEXTURE0 + textureUnit);

    if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
	// Scale up the texture to the next highest power of two dimensions.
	var canvas    = document.createElement("canvas");
	canvas.width  = nextHighestPowerOfTwo(image.width);
	canvas.height = nextHighestPowerOfTwo(image.height);
	var ctx       = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	image = canvas;
    }
    gl.texImage2D (gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);
}
function initAlpha(url, textureUnit) {

    var texture = gl.createTexture();
	gl.uniform1i(program.AlphamapIndex, textureUnit);

    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var image = new Image();
    image.addEventListener("load",
			   function() {
			       loadAlpha(image, textureUnit);
			       requestAnimationFrame(drawScene);
			   },
			   false);
    image.addEventListener("error",
			   function(err) {
			       console.log("MALA SUERTE: no estÃ¡ disponible " + this.src);
			       requestAnimationFrame(drawScene);
			   },
			   false);
    image.crossOrigin = 'anonymous'; // Esto y el uso de corproxy en la URL evita que Chrome se queje de SecurityError al cargar la imagen de otro dominio
    image.src = url;

}
function initTextures() { // Dejamos unidad 0 para sombras

  initTexture("http://i.imgur.com/okqvaqG.png", 1);
    initTexture("http://i.imgur.com/FIj3JLO.png", 2);
    initTexture("http://i.imgur.com/az4W4eu.jpg", 3);
    initTexture("http://i.imgur.com/KmnswT3.jpg", 4);
    initTexture("http://i.imgur.com/KvXhUhb.png", 5);

}
function initAlphas(image, index) {

   initAlpha("http://i.imgur.com/axZ0FhQ.png", 6);
    initAlpha("http://i.imgur.com/DTdcFkj.png", 7);
    initAlpha("http://i.imgur.com/KmnswT3.jpg", 8);


}
function animation() {
	rotationmask = rotationmask + 0.01;
  requestAnimationFrame(drawScene);

}
function initWebGL() {
    
    gl = getWebGLContext();

    if (!gl) {
	alert("WebGL no está disponible");
	return;
    }
    
    initShaders();
    initFramebufferObject();
    initPrimitives();
    initRendering();
    initHandlers();
    initTextures();
  initAlphas();
  setInterval(animation, 60);

    requestAnimationFrame(drawScene);
    
}

initWebGL();
