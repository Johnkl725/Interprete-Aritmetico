class ArithmeticInterpreter {
    constructor() {
        this.variables = {};
    }

    tokenizar(expression) {
        const tokens = [];
        let currentToken = "";
        for (const char of expression) {
            if (/[a-zA-Z0-9_]/.test(char)) {
                currentToken += char;
            } else if (["+", "-", "*", "/", "(", ")", "=", ",", "<", ">", " "].includes(char)) {
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = "";
                }
                if (char !== " ") {
                    tokens.push(char);
                }
            }
        }
        if (currentToken) {
            tokens.push(currentToken);
        }
        return tokens;
    }

    parse(tokens) {
        const self = this;

        function parseExpression() {
            let result = parseTerm();
            while (tokens.length && ["+", "-"].includes(tokens[0])) {
                const op = tokens.shift();
                if (op === "+") {
                    result = ["add", result, parseTerm()];
                } else {
                    result = ["subtract", result, parseTerm()];
                }
            }
            return result;
        }

        function parseTerm() {
            let result = parseFactor();
            while (tokens.length && ["*", "/"].includes(tokens[0])) {
                const op = tokens.shift();
                if (op === "*") {
                    result = ["multiply", result, parseFactor()];
                } else {
                    result = ["divide", result, parseFactor()];
                }
            }
            return result;
        }

        function parseFactor() {
            if (tokens[0] === "(") {
                tokens.shift();
                const result = parseExpression();
                if (tokens.shift() !== ")") throw new Error("Expected closing parenthesis");
                return result;
            } else if (tokens[0] in self.variables) {
                return ["var", tokens.shift()];
            } else {
                return ["num", parseFloat(tokens.shift())];
            }
        }

        function parseAssignment() {
            const variable = tokens.shift();
            if (tokens.shift() !== "=") throw new Error("Expected '='");
            const expr = parseExpression();
            return ["assign", variable, expr];
        }

        function parseCout() {
            tokens.shift(); // Remove 'cout'
            if (tokens.shift() !== "<" || tokens.shift() !== "<") throw new Error("Expected '<<'");
            const variable = tokens.shift();
            return ["cout", variable];
        }

        const ast = [];
        while (tokens.length) {
            if (tokens[0] === "cout") {
                ast.push(parseCout());
            } else if (/^[a-zA-Z_]\w*$/.test(tokens[0]) && tokens[1] === "=") {
                ast.push(parseAssignment());
            } else {
                ast.push(parseExpression());
            }
        }
        return ast;
    }

    evaluate(ast) {
        const self = this;
        const results = [];

        function evalNode(node) {
            if (Array.isArray(node)) {
                const op = node[0];
                switch (op) {
                    case "add":
                        return evalNode(node[1]) + evalNode(node[2]);
                    case "subtract":
                        return evalNode(node[1]) - evalNode(node[2]);
                    case "multiply":
                        return evalNode(node[1]) * evalNode(node[2]);
                    case "divide":
                        return evalNode(node[1]) / evalNode(node[2]);
                    case "assign":
                        const variable = node[1];
                        const value = evalNode(node[2]);
                        self.variables[variable] = value;
                        return value;
                    case "var":
                        return self.variables[node[1]];
                    case "num":
                        return node[1];
                    case "cout":
                        const varName = node[1];
                        if (varName in self.variables) {
                            results.push({ type: "cout", value: self.variables[varName] });
                        } else {
                            results.push({ type: "error", value: `Error: variable '${varName}' no definida.` });
                        }
                        return null;
                }
            } else {
                return node;
            }
        }

        for (const node of ast) {
            const result = evalNode(node);
            if (result !== null && result !== undefined) {
                results.push({ type: "result", value: result });
            }
        }

        return results;
    }

    interpret(expression) {
        const tokens = this.tokenizar(expression);
        const ast = this.parse(tokens);
        return this.evaluate(ast);
    }
}
function interpretCode() {
    const interpreter = new ArithmeticInterpreter();
    const codeInput = document.getElementById("codeInput");
    const code = codeInput.value.trim();
    const outputElement = document.getElementById("output");
    
    // Limpiar contenido previo del output
    outputElement.textContent = "";

    // Dividir el código en líneas separadas
    const lines = code.split("\n");
    let coutOutputs = "";

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            continue; // Saltar líneas vacías
        }
        try {
            const results = interpreter.interpret(trimmedLine);

            for (const result of results) {
                if (result.type === "cout") {
                    coutOutputs += `${result.value}\n`;
                } else if (result.type === "error") {
                    outputElement.textContent += `Error para '${trimmedLine}': ${result.value}\n`;
                }
            }
        } catch (e) {
            outputElement.textContent += `Error para '${trimmedLine}': ${e.message}\n`;
        }
    }

    if (coutOutputs) {
        outputElement.textContent += `${coutOutputs}`;
    }

    // Scroll hacia abajo para mostrar la salida más reciente
    outputElement.scrollTop = outputElement.scrollHeight;
}
