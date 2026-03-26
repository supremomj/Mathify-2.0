/**
 * Curriculum-Aware Question Generator
 * Generates questions dynamically based on DepEd MATATAG Curriculum learning outcomes
 * Uses the topic's learning outcome, category, and grade to create appropriate questions
 */

class CurriculumQuestionGenerator {
  constructor() {
    this.questionTemplates = this.initializeTemplates();
    // Filipino names for word problems
    this.filipinoNames = ['Maria', 'Juan', 'Lita', 'Pedro', 'Ana', 'Jose', 'Rosa', 'Carlo', 'Mika', 'Aling Nena', 'Mang Tomas', 'Ate Luz', 'Kuya Ben', 'Tita Cora'];
    // Filipino scenarios for word problems
    this.filipinoScenarios = [
      { place: 'sari-sari store', items: ['candy', 'juice', 'bread', 'ice candy', 'biscuits'] },
      { place: 'palengke', items: ['mangoes', 'bangus', 'kamote', 'sitaw', 'tomatoes'] },
      { place: 'school canteen', items: ['pandesal', 'banana cue', 'kwek-kwek', 'fishball', 'halo-halo'] },
      { place: 'barangay fiesta', items: ['lechon', 'bibingka', 'kakanin', 'lumpia', 'puto'] },
      { place: 'bakery', items: ['ensaymada', 'pandesal', 'monay', 'Spanish bread', 'cheese bread'] }
    ];
  }

  /** Pick a random Filipino name */
  randomName(seed) { return this.filipinoNames[Math.abs(seed) % this.filipinoNames.length]; }
  /** Pick a random scenario */
  randomScenario(seed) { return this.filipinoScenarios[Math.abs(seed) % this.filipinoScenarios.length]; }
  /** Pick a random item from a scenario */
  randomItem(scenario, seed) { return scenario.items[Math.abs(seed) % scenario.items.length]; }

  /**
   * Generate questions based on curriculum topic
   * @param {Object} topic - Curriculum topic with learning outcome, category, grade, etc.
   * @param {number} count - Number of questions to generate
   * @param {number} index - Index for variety (prevents duplicates)
   * @returns {Array} Array of question objects
   */
  /**
   * Generate questions based on curriculum topic
   * @param {Object} topic - Curriculum topic with learning outcome, category, grade, etc.
   * @param {number} count - Number of questions to generate
   * @param {number} index - Index for variety (prevents duplicates)
   * @param {string} difficulty - 'easy' | 'medium' | 'hard'
   * @returns {Array} Array of question objects
   */
  generateQuestionsForTopic(topic, count = 10, index = 0, difficulty = 'medium') {
    const questions = [];
    const usedSignatures = new Set();
    const learningOutcome = topic.learning_outcome || '';
    const category = topic.category || 'Operations';
    let grade = parseInt(topic.grade, 10);
    if (!grade || isNaN(grade)) grade = 1;
    if (grade < 1) grade = 1;
    if (grade > 6) grade = 6;
    const topicCode = topic.topic_code || '';

    // Derive skill tag from topic
    const skill = this.deriveSkillTag(category, learningOutcome, topicCode);

    // Generate a massive random offset to ensure entirely unique game sessions
    const randomOffset = Math.floor(Math.random() * 1000000);

    for (let i = 0; i < count; i++) {
      let question = null;
      let attempts = 0;

      while (!question && attempts < 20) {
        attempts++;
        // Increment seed with attempts so retry loops generate entirely new questions
        const currentIndex = index + randomOffset + i + (attempts * 100);
        
        question = this.generateQuestionFromLearningOutcome(
          learningOutcome, category, grade, topicCode, currentIndex, i, difficulty
        );

        if (question) {
          const signature = `${question.question}-${question.correctAnswer}`;
          if (usedSignatures.has(signature)) {
            question = null;
            continue;
          }
          usedSignatures.add(signature);
          // Attach metadata
          question.difficulty = difficulty;
          question.skill = question.skill || skill;
          if (!question.explanation) {
            question.explanation = this.buildExplanation(question);
          }
        }
      }

      if (question) {
        questions.push(question);
      }
    }

    // Shuffle to randomize order while keeping curriculum alignment
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    return questions;
  }

  /** Derive a human-readable skill tag from category and learning outcome */
  deriveSkillTag(category, outcome, topicCode) {
    const o = outcome.toLowerCase();
    if (o.includes('addition') || o.includes('add') || o.includes('sum')) {
      const rangeMatch = o.match(/up to ([\d,]+)/);
      return rangeMatch ? `Addition up to ${rangeMatch[1]}` : 'Addition';
    }
    if (o.includes('subtraction') || o.includes('subtract')) {
      const rangeMatch = o.match(/up to ([\d,]+)/);
      return rangeMatch ? `Subtraction up to ${rangeMatch[1]}` : 'Subtraction';
    }
    if (o.includes('multiplication') || o.includes('multiply')) return 'Multiplication';
    if (o.includes('division') || o.includes('divide')) return 'Division';
    if (o.includes('fraction')) return 'Fractions';
    if (o.includes('decimal')) return 'Decimals';
    if (o.includes('ratio') || o.includes('proportion')) return 'Ratio & Proportion';
    if (o.includes('percentage') || o.includes('percent')) return 'Percentages';
    if (o.includes('money') || o.includes('peso') || o.includes('₱')) return 'Money (Philippine Peso)';
    if (o.includes('time') || o.includes('hour') || o.includes('calendar')) return 'Time & Calendar';
    if (o.includes('pattern')) return 'Patterns';
    if (o.includes('shape') || o.includes('2-dimensional') || o.includes('2d')) return '2D Shapes';
    if (o.includes('area')) return 'Area';
    if (o.includes('perimeter')) return 'Perimeter';
    if (o.includes('angle')) return 'Angles';
    if (o.includes('ordinal')) return 'Ordinal Numbers';
    if (o.includes('count') || o.includes('number')) return 'Number Sense';
    if (o.includes('data') || o.includes('graph') || o.includes('pictograph')) return 'Data & Graphs';
    if (o.includes('length') || o.includes('measure')) return 'Measurement';
    if (o.includes('mass') || o.includes('weight')) return 'Mass & Weight';
    if (o.includes('volume') || o.includes('capacity')) return 'Volume & Capacity';
    return category || 'Mathematics';
  }

  /** Build a step-by-step explanation for a question */
  buildExplanation(q) {
    const nums = (q.question.match(/[\d,]+/g) || []).map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => !isNaN(n));
    const ca = q.type === 'multiple-choice' || q.type === 'true-false'
      ? (q.options ? q.options[q.correctAnswer] : q.correctAnswer)
      : q.correctAnswer;

    if (q.question.includes('+') || q.question.toLowerCase().includes('total') || q.question.toLowerCase().includes('together')) {
      if (nums.length >= 2) return `Step 1: Identify the numbers: ${nums[0]} and ${nums[1]}.\nStep 2: Add them: ${nums[0]} + ${nums[1]} = ${ca}.\nThe answer is ${ca}.`;
    }
    if (q.question.includes('-') || q.question.toLowerCase().includes('left') || q.question.toLowerCase().includes('difference')) {
      if (nums.length >= 2) return `Step 1: Identify the numbers: ${Math.max(nums[0],nums[1])} and ${Math.min(nums[0],nums[1])}.\nStep 2: Subtract: ${Math.max(nums[0],nums[1])} - ${Math.min(nums[0],nums[1])} = ${ca}.\nThe answer is ${ca}.`;
    }
    if (q.question.includes('×') || q.question.toLowerCase().includes('times')) {
      if (nums.length >= 2) return `Step 1: Identify the factors: ${nums[0]} and ${nums[1]}.\nStep 2: Multiply: ${nums[0]} × ${nums[1]} = ${ca}.\nThe answer is ${ca}.`;
    }
    if (q.question.includes('÷')) {
      if (nums.length >= 2) return `Step 1: Divide ${nums[0]} by ${nums[1]}.\nStep 2: ${nums[0]} ÷ ${nums[1]} = ${ca}.\nThe answer is ${ca}.`;
    }
    return `The correct answer is ${ca}.`;
  }

  /** Get difficulty multiplier for number ranges */
  getDifficultyRange(grade, difficulty) {
    const base = { 1: 100, 2: 1000, 3: 10000, 4: 100000, 5: 1000000, 6: 1000000 };
    const mult = { easy: 0.3, medium: 1, hard: 1.5 };
    return Math.round((base[grade] || 100) * (mult[difficulty] || 1));
  }

  /**
   * Generate question based on learning outcome text
   */
  generateQuestionFromLearningOutcome(learningOutcome, category, grade, topicCode, index, questionNum, difficulty = 'medium') {
    const outcome = learningOutcome.toLowerCase();

    // ~20% True/False variant, ~15% fill-blank variant
    const variantRoll = (index * 7 + questionNum * 13) % 100;
    const wantTF = variantRoll < 20;
    const wantFillBlank = variantRoll >= 20 && variantRoll < 35;
    
    // Number Sense questions
    if (category === 'Number Sense') {
      if (outcome.includes('count') || outcome.includes('recognize') || outcome.includes('represent') || outcome.includes('whole numbers')) {
        return this.generateNumberRecognitionQuestion(grade, index, outcome);
      } else if (outcome.includes('ordinal')) {
        return this.generateOrdinalQuestion(grade, index, outcome);
      } else if (outcome.includes('fraction')) {
        return this.generateFractionQuestion(grade, index, outcome);
      } else if (outcome.includes('decimal')) {
        return this.generateDecimalQuestion(grade, index, outcome);
      } else if (outcome.includes('odd') || outcome.includes('even')) {
        return this.generateOddEvenQuestion(grade, index);
      } else if (outcome.includes('factor') || outcome.includes('multiple')) {
        return this.generateFactorsMultiplesQuestion(grade, index, outcome);
      } else if (outcome.includes('ratio') || outcome.includes('proportion') || outcome.includes('percentage')) {
        return this.generateRatioProportionQuestion(grade, index, outcome);
      }
    }
    
    // Operations questions
    else if (category === 'Operations') {
      if (outcome.includes('addition') || outcome.includes('add') || outcome.includes('sum')) {
        return this.generateAdditionQuestion(grade, index, outcome, difficulty);
      } else if (outcome.includes('subtraction') || outcome.includes('subtract') || outcome.includes('difference')) {
        return this.generateSubtractionQuestion(grade, index, outcome, difficulty);
      } else if (outcome.includes('multiplication') || outcome.includes('multiply') || outcome.includes('product')) {
        return this.generateMultiplicationQuestion(grade, index, outcome, difficulty);
      } else if (outcome.includes('division') || outcome.includes('divide') || outcome.includes('quotient')) {
        return this.generateDivisionQuestion(grade, index, outcome, difficulty);
      } else if (outcome.includes('gemdas') || outcome.includes('order of operations') || outcome.includes('exponent')) {
        return this.generateGEMDASQuestion(grade, index, outcome, difficulty);
      } else if (outcome.includes('four operations') || outcome.includes('operations')) {
        const opType = questionNum % 4;
        if (opType === 0) return this.generateAdditionQuestion(grade, index, outcome, difficulty);
        if (opType === 1) return this.generateSubtractionQuestion(grade, index, outcome, difficulty);
        if (opType === 2) return this.generateMultiplicationQuestion(grade, index, outcome, difficulty);
        return this.generateDivisionQuestion(grade, index, outcome, difficulty);
      }
    }
    
    // Geometry questions
    else if (category === 'Geometry') {
      if (outcome.includes('shape') || outcome.includes('2-dimensional') || outcome.includes('2d')) {
        return this.generateShapeQuestion(grade, index, outcome);
      } else if (outcome.includes('area')) {
        return this.generateAreaQuestion(grade, index, outcome);
      } else if (outcome.includes('perimeter')) {
        return this.generatePerimeterQuestion(grade, index, outcome);
      } else if (outcome.includes('angle')) {
        return this.generateAngleQuestion(grade, index, outcome);
      } else if (outcome.includes('circle')) {
        return this.generateCircleQuestion(grade, index, outcome);
      } else if (outcome.includes('triangle') || outcome.includes('quadrilateral')) {
        return this.generatePolygonQuestion(grade, index, outcome);
      } else if (outcome.includes('symmetry') || outcome.includes('reflection') || outcome.includes('rotation') || outcome.includes('translation')) {
        return this.generateTransformationQuestion(grade, index, outcome);
      }
    }
    
    // Measurement questions
    else if (category === 'Measurement') {
      if (outcome.includes('money') || outcome.includes('philippine') || outcome.includes('peso') || outcome.includes('₱')) {
        return this.generateMoneyQuestion(grade, index, outcome, difficulty);
      } else if (outcome.includes('time') || outcome.includes('hour') || outcome.includes('minute') || outcome.includes('elapsed')) {
        return this.generateTimeQuestion(grade, index, outcome);
      } else if (outcome.includes('length') || outcome.includes('distance') || outcome.includes('measure')) {
        return this.generateLengthQuestion(grade, index, outcome);
      } else if (outcome.includes('mass') || outcome.includes('weight')) {
        return this.generateMassQuestion(grade, index, outcome);
      } else if (outcome.includes('capacity') || outcome.includes('volume')) {
        return this.generateVolumeQuestion(grade, index, outcome);
      }
    }
    
    // Data questions
    else if (category === 'Data') {
      if (outcome.includes('pictograph') || outcome.includes('graph') || outcome.includes('data')) {
        return this.generateDataQuestion(grade, index, outcome);
      } else if (outcome.includes('probability') || outcome.includes('outcome')) {
        return this.generateProbabilityQuestion(grade, index, outcome);
      }
    }
    
    // Patterns questions
    else if (category === 'Patterns') {
      if (outcome.includes('pattern') || outcome.includes('extend') || outcome.includes('create')) {
        return this.generatePatternQuestion(grade, index, outcome);
      }
    }
    
    // Problem Solving questions
    else if (category === 'Problem Solving') {
      return this.generateProblemSolvingQuestion(grade, index, outcome, difficulty);
    }

    // Default fallback
    return this.generateDefaultQuestion(grade, index, category, difficulty);
  }

  // Question generators based on learning outcomes

  generateNumberRecognitionQuestion(grade, index, outcome) {
    // Extract number range from outcome (e.g., "up to 100", "up to 1,000")
    let maxNum = 100;
    if (outcome.includes('1,000') || outcome.includes('1000')) maxNum = 1000;
    else if (outcome.includes('10,000') || outcome.includes('10000')) maxNum = 10000;
    else if (outcome.includes('1,000,000') || outcome.includes('1000000') || outcome.includes('1m')) maxNum = 1000000;
    else if (grade === 1) maxNum = 100;
    else if (grade === 2) maxNum = 1000;
    else if (grade === 3) maxNum = 10000;
    else if (grade >= 4) maxNum = 1000000;

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 137);
    const num = Math.floor((seed * 7919) % maxNum) + 1;
    const options = [num];
    
    for (let i = 0; i < 3; i++) {
      const optSeed = seed + (i + 1) * 1000;
      const opt = Math.floor((optSeed * 7919) % maxNum) + 1;
      if (!options.includes(opt)) options.push(opt);
    }
    
    while (options.length < 4) {
      const opt = Math.floor(Math.random() * maxNum) + 1;
      if (!options.includes(opt)) options.push(opt);
    }
    
    options.sort(() => Math.random() - 0.5);

    // Grade 1: show answer choices as number words (e.g., "thirty-two")
    if (grade === 1) {
      const wordOptions = options.map((n) => this.numberToWords(n));
      return {
        question: `What number is this: ${num.toLocaleString()}?`,
        type: 'multiple-choice',
        options: wordOptions,
        correctAnswer: options.indexOf(num),
        icon: '🔢'
      };
    }

    // Grade 2+: keep numeric choices
    return {
      question: `What number is this: ${num.toLocaleString()}?`,
      type: 'multiple-choice',
      options: options.map((n) => n.toLocaleString()),
      correctAnswer: options.indexOf(num),
      icon: '🔢'
    };
  }

  generateOrdinalQuestion(grade, index, outcome) {
    // Extract ordinal range from outcome (e.g., "up to 10th", "up to 20th")
    let maxOrd = 10;
    if (outcome.includes('20th')) maxOrd = 20;
    else if (outcome.includes('100th')) maxOrd = 100;
    else if (grade === 1) maxOrd = 10;
    else if (grade === 2) maxOrd = 20;
    else if (grade >= 3) maxOrd = 100;

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const position = (Math.floor(seed * 7919) % maxOrd) + 1;
    const ordinals = this.getOrdinals(maxOrd);
    
    const options = [ordinals[position - 1]];
    for (let i = 0; i < 3; i++) {
      const optIndex = (Math.floor(seed * 9973) + i) % maxOrd;
      const opt = ordinals[optIndex];
      if (!options.includes(opt)) options.push(opt);
    }
    
    while (options.length < 4) {
      const opt = ordinals[Math.floor(Math.random() * maxOrd)];
      if (!options.includes(opt)) options.push(opt);
    }
    
    options.sort(() => Math.random() - 0.5);
    
    return {
      question: `What is the ordinal number for position ${position}?`,
      type: 'multiple-choice',
      options: options,
      correctAnswer: options.indexOf(ordinals[position - 1]),
      icon: '📊'
    };
  }

  generateFractionQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    
    if (grade === 1 || outcome.includes('1/2') || outcome.includes('1/4')) {
      const fractions = ['1/2', '1/4'];
      const frac = fractions[index % fractions.length];
      return {
        question: `Which shape shows ${frac}?`,
        type: 'multiple-choice',
        options: ['Half shaded', 'Quarter shaded', 'Full shaded', 'Empty'],
        correctAnswer: frac === '1/2' ? 0 : 1,
        icon: '🍕'
      };
    } else {
      // Extract denominators from outcome if mentioned
      let denominators = [2, 3, 4, 5, 6, 8];
      if (outcome.includes('denominator')) {
        const denMatch = outcome.match(/denominator[s]?\s+(\d+(?:\s*,\s*\d+)*)/);
        if (denMatch) {
          denominators = denMatch[1].split(',').map(d => parseInt(d.trim()));
        }
      }
      
      const num = (Math.floor(seed * 7919) % 5) + 1;
      const den = denominators[(Math.floor(seed * 9973) + index) % denominators.length];
      
      if (outcome.includes('decimal') || outcome.includes('convert')) {
        return {
          question: `What is ${num}/${den} as a decimal? (Round to 2 decimals)`,
          type: 'number',
          correctAnswer: Math.round((num / den) * 100) / 100,
          icon: '🍰'
        };
      } else {
        return {
          question: `What is ${num}/${den} in simplest form?`,
          type: 'multiple-choice',
          options: this.generateFractionOptions(num, den),
          correctAnswer: 0,
          icon: '🍰'
        };
      }
    }
  }

  generateAdditionQuestion(grade, index, outcome, difficulty) {
    const diff = difficulty || 'medium';
    let maxSum = 100;
    if (outcome.includes('100')) maxSum = 100;
    else if (outcome.includes('1,000') || outcome.includes('1000')) maxSum = 1000;
    else if (outcome.includes('10,000') || outcome.includes('10000')) maxSum = 10000;
    else if (outcome.includes('1,000,000') || outcome.includes('1000000')) maxSum = 1000000;
    else if (grade === 1) maxSum = 100;
    else if (grade === 2) maxSum = 1000;
    else if (grade === 3) maxSum = 10000;
    else if (grade >= 4) maxSum = 1000000;

    // Difficulty scaling
    if (diff === 'easy') maxSum = Math.max(20, Math.round(maxSum * 0.3));
    else if (diff === 'hard') maxSum = Math.round(maxSum * 1.5);

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 137);
    let a, b, answer;
    
    if (grade === 1) {
      const cap = Math.min(maxSum, 100);
      a = (Math.floor(seed * 7919) % (cap - 1)) + 1;
      const maxB = Math.min(cap - a, cap - 1);
      b = (Math.floor(seed * 9973) % Math.max(maxB, 1)) + 1;
      answer = a + b;
    } else {
      a = (Math.floor(seed * 7919) % (maxSum / 2)) + 1;
      b = (Math.floor(seed * 9973) % (maxSum / 2)) + 1;
      answer = a + b;
    }

    const skill = maxSum <= 100 ? 'Addition up to 100' : `Addition up to ${maxSum.toLocaleString()}`;
    const variantRoll = (index * 7 + 3) % 100;

    // ~25% chance of Filipino-context word problem
    if (variantRoll < 25) {
      const name1 = this.randomName(seed);
      const name2 = this.randomName(seed + 5);
      const scenario = this.randomScenario(seed);
      const item = this.randomItem(scenario, seed);
      return {
        question: `${name1} bought ${a} pieces of ${item} at the ${scenario.place}. ${name2} bought ${b} more. How many pieces of ${item} do they have together?`,
        type: 'number',
        correctAnswer: answer,
        icon: '➕',
        skill,
        explanation: `Step 1: ${name1} bought ${a} pieces of ${item}.\nStep 2: ${name2} bought ${b} more.\nStep 3: Add them: ${a} + ${b} = ${answer}.\nThe answer is ${answer}.`
      };
    }

    // ~20% True/False variant
    if (variantRoll >= 25 && variantRoll < 45) {
      const wrongAnswer = answer + (Math.random() > 0.5 ? 1 : -1) * ((seed % 5) + 1);
      const showCorrect = index % 2 === 0;
      const shown = showCorrect ? answer : wrongAnswer;
      return {
        question: `True or False: ${a} + ${b} = ${shown}`,
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: showCorrect ? 0 : 1,
        icon: '➕',
        skill,
        explanation: `${a} + ${b} = ${answer}. The statement says ${shown}, so the answer is ${showCorrect ? 'True' : 'False'}.`
      };
    }

    // ~15% Fill-in-the-blank variant
    if (variantRoll >= 45 && variantRoll < 60) {
      return {
        question: `Fill in the blank: ___ + ${b} = ${answer}`,
        type: 'fill-blank',
        correctAnswer: a,
        icon: '➕',
        skill,
        explanation: `To find the missing number: ${answer} - ${b} = ${a}.\nSo ___ = ${a}.`
      };
    }

    return {
      question: `What is ${a} + ${b}?`,
      type: 'number',
      correctAnswer: answer,
      icon: '➕',
      skill,
      explanation: `Step 1: Add ${a} + ${b}.\nStep 2: ${a} + ${b} = ${answer}.\nThe answer is ${answer}.`
    };
  }

  generateSubtractionQuestion(grade, index, outcome, difficulty) {
    const diff = difficulty || 'medium';
    let maxNum = 100;
    if (outcome.includes('1,000') || outcome.includes('1000')) maxNum = 1000;
    else if (outcome.includes('10,000') || outcome.includes('10000')) maxNum = 10000;
    else if (grade === 1) maxNum = 100;
    else if (grade === 2) maxNum = 1000;
    else if (grade >= 3) maxNum = 10000;

    if (diff === 'easy') maxNum = Math.max(20, Math.round(maxNum * 0.3));
    else if (diff === 'hard') maxNum = Math.round(maxNum * 1.5);

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 137);
    let larger, smaller, answer;
    
    if (grade === 1) {
      const cap = Math.min(maxNum, 100);
      larger = (Math.floor(seed * 7919) % (cap - 1)) + 2;
      smaller = (Math.floor(seed * 9973) % (larger - 1)) + 1;
      answer = larger - smaller;
    } else {
      const a = (Math.floor(seed * 7919) % (maxNum / 2)) + 1;
      const b = (Math.floor(seed * 9973) % (maxNum / 2)) + 1;
      larger = Math.max(a, b);
      smaller = Math.min(a, b);
      answer = larger - smaller;
    }

    const skill = 'Subtraction';
    const variantRoll = (index * 7 + 5) % 100;

    // Filipino-context word problem
    if (variantRoll < 25) {
      const name = this.randomName(seed);
      const scenario = this.randomScenario(seed);
      const item = this.randomItem(scenario, seed);
      return {
        question: `${name} had ${larger} pieces of ${item}. After sharing with friends, ${smaller} were given away. How many pieces of ${item} are left?`,
        type: 'number',
        correctAnswer: answer,
        icon: '➖',
        skill,
        explanation: `Step 1: ${name} started with ${larger} pieces of ${item}.\nStep 2: ${smaller} were given away.\nStep 3: Subtract: ${larger} - ${smaller} = ${answer}.\nThe answer is ${answer}.`
      };
    }

    // True/False
    if (variantRoll >= 25 && variantRoll < 45) {
      const wrongAnswer = answer + (Math.random() > 0.5 ? 1 : -1) * ((seed % 4) + 1);
      const showCorrect = index % 2 === 0;
      const shown = showCorrect ? answer : wrongAnswer;
      return {
        question: `True or False: ${larger} - ${smaller} = ${shown}`,
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: showCorrect ? 0 : 1,
        icon: '➖',
        skill,
        explanation: `${larger} - ${smaller} = ${answer}. The statement says ${shown}, so the answer is ${showCorrect ? 'True' : 'False'}.`
      };
    }

    // Fill-in-the-blank
    if (variantRoll >= 45 && variantRoll < 60) {
      return {
        question: `Fill in the blank: ${larger} - ___ = ${answer}`,
        type: 'fill-blank',
        correctAnswer: smaller,
        icon: '➖',
        skill,
        explanation: `To find the missing number: ${larger} - ${answer} = ${smaller}.\nSo ___ = ${smaller}.`
      };
    }
    
    return {
      question: `What is ${larger} - ${smaller}?`,
      type: 'number',
      correctAnswer: answer,
      icon: '➖',
      skill,
      explanation: `Step 1: Subtract ${smaller} from ${larger}.\nStep 2: ${larger} - ${smaller} = ${answer}.\nThe answer is ${answer}.`
    };
  }

  generateMultiplicationQuestion(grade, index, outcome, difficulty) {
    let tables = [];
    if (outcome.includes('2, 3, 4, 5, 10') || outcome.includes('2,3,4,5,10')) {
      tables = [2, 3, 4, 5, 10];
    } else if (outcome.includes('6, 7, 8, 9') || outcome.includes('6,7,8,9')) {
      tables = [6, 7, 8, 9];
    } else if (grade === 2) {
      tables = [2, 3, 4, 5, 10];
    } else if (grade >= 3) {
      tables = [6, 7, 8, 9];
    } else {
      tables = [2, 3, 4, 5];
    }

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const table = tables[(Math.floor(seed * 7919) + index) % tables.length];
    let maxMult = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 15 : 12;
    const multiplier = (Math.floor(seed * 9973) % maxMult) + 1;
    const answer = table * multiplier;
    const skill = 'Multiplication';
    const variantRoll = (index * 7 + 9) % 100;

    // T/F variant
    if (variantRoll < 20) {
      const wrongAnswer = answer + (Math.random() > 0.5 ? 1 : -1) * ((seed % 5) + 1);
      const showCorrect = index % 2 === 0;
      const shown = showCorrect ? answer : wrongAnswer;
      return {
        question: `True or False: ${table} × ${multiplier} = ${shown}`,
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: showCorrect ? 0 : 1,
        icon: '✖️',
        skill,
        explanation: `${table} × ${multiplier} = ${answer}. The statement says ${shown}, so the answer is ${showCorrect ? 'True' : 'False'}.`
      };
    }

    // Filipino word problem variant
    if (variantRoll >= 20 && variantRoll < 40) {
      const name = this.randomName(seed);
      return {
        question: `${name} has ${multiplier} boxes. Each box has ${table} items. How many items does ${name} have in all?`,
        type: 'number',
        correctAnswer: answer,
        icon: '✖️',
        skill,
        explanation: `Step 1: ${name} has ${multiplier} boxes with ${table} items each.\nStep 2: Multiply: ${table} × ${multiplier} = ${answer}.\nThe answer is ${answer}.`
      };
    }
    
    return {
      question: `What is ${table} × ${multiplier}?`,
      type: 'number',
      correctAnswer: answer,
      icon: '✖️',
      skill,
      explanation: `${table} × ${multiplier} = ${answer}.`
    };
  }

  generateDivisionQuestion(grade, index, outcome, difficulty) {
    let tables = [];
    if (outcome.includes('2, 3, 4, 5, 10') || outcome.includes('2,3,4,5,10')) {
      tables = [2, 3, 4, 5, 10];
    } else if (outcome.includes('6, 7, 8, 9') || outcome.includes('6,7,8,9')) {
      tables = [6, 7, 8, 9];
    } else if (grade === 2) {
      tables = [2, 3, 4, 5, 10];
    } else if (grade >= 3) {
      tables = [6, 7, 8, 9];
    } else {
      tables = [2, 3, 4, 5];
    }

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const table = tables[(Math.floor(seed * 7919) + index) % tables.length];
    let maxMult = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 15 : 12;
    const multiplier = (Math.floor(seed * 9973) % maxMult) + 1;
    const product = table * multiplier;
    
    return {
      question: `What is ${product} ÷ ${table}?`,
      type: 'number',
      correctAnswer: multiplier,
      icon: '➗',
      skill: 'Division',
      explanation: `Step 1: We need to find how many times ${table} fits into ${product}.\nStep 2: ${product} ÷ ${table} = ${multiplier}.\nThe answer is ${multiplier}.`
    };
  }

  generateGEMDASQuestion(grade, index, outcome, difficulty) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const a = (Math.floor(seed * 7919) % 10) + 1;
    const b = (Math.floor(seed * 9973) % 10) + 1;
    const c = (Math.floor(seed * 7919 * 9973) % 10) + 1;
    
    // Vary the expression type
    const exprType = index % 3;
    let expression, answer;
    
    if (exprType === 0) {
      expression = `${a} + ${b} × ${c}`;
      answer = a + (b * c);
    } else if (exprType === 1) {
      expression = `${a} × ${b} + ${c}`;
      answer = (a * b) + c;
    } else {
      expression = `(${a} + ${b}) × ${c}`;
      answer = (a + b) * c;
    }
    
    return {
      question: `Solve: ${expression} (Follow GEMDAS)`,
      type: 'number',
      correctAnswer: answer,
      icon: '🧮'
    };
  }

  generateShapeQuestion(grade, index, outcome) {
    let shapes = ['Circle', 'Square', 'Triangle', 'Rectangle'];
    if (outcome.includes('pentagon')) shapes.push('Pentagon');
    if (outcome.includes('hexagon')) shapes.push('Hexagon');
    if (grade >= 2) shapes = ['Circle', 'Square', 'Triangle', 'Rectangle', 'Pentagon', 'Hexagon'];
    
    const shape = shapes[index % shapes.length];
    const sides = {
      'Circle': 0,
      'Triangle': 3,
      'Square': 4,
      'Rectangle': 4,
      'Pentagon': 5,
      'Hexagon': 6
    };
    
    return {
      question: `How many sides does a ${shape} have?`,
      type: 'number',
      correctAnswer: sides[shape],
      icon: '🔷'
    };
  }

  generateAreaQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const length = (Math.floor(seed * 7919) % 10) + 1;
    const width = (Math.floor(seed * 9973) % 10) + 1;
    
    let shape = 'rectangle';
    if (outcome.includes('square')) shape = 'square';
    else if (outcome.includes('triangle')) shape = 'triangle';
    else if (outcome.includes('parallelogram')) shape = 'parallelogram';
    else if (outcome.includes('trapezoid')) shape = 'trapezoid';
    
    let question, answer;
    if (shape === 'square') {
      question = `What is the area of a square with side length ${length}?`;
      answer = length * length;
    } else if (shape === 'triangle') {
      question = `What is the area of a triangle with base ${length} and height ${width}?`;
      answer = (length * width) / 2;
    } else if (shape === 'parallelogram') {
      question = `What is the area of a parallelogram with base ${length} and height ${width}?`;
      answer = length * width;
    } else if (shape === 'trapezoid') {
      const base2 = (Math.floor(seed * 7919 * 9973) % 10) + 1;
      question = `What is the area of a trapezoid with bases ${length} and ${base2}, and height ${width}?`;
      answer = ((length + base2) * width) / 2;
    } else {
      question = `What is the area of a rectangle with length ${length} and width ${width}?`;
      answer = length * width;
    }
    
    return {
      question: question,
      type: 'number',
      correctAnswer: answer,
      icon: '📐'
    };
  }

  generatePerimeterQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const length = (Math.floor(seed * 7919) % 10) + 1;
    const width = (Math.floor(seed * 9973) % 10) + 1;
    
    return {
      question: `What is the perimeter of a rectangle with length ${length} and width ${width}?`,
      type: 'number',
      correctAnswer: 2 * (length + width),
      icon: '📐'
    };
  }

  generateAngleQuestion(grade, index, outcome) {
    const angles = [
      { name: 'Right angle', value: 90 },
      { name: 'Acute angle', value: 45 },
      { name: 'Obtuse angle', value: 120 }
    ];
    
    const angle = angles[index % angles.length];
    
    return {
      question: `What is the measure of a ${angle.name.toLowerCase()}?`,
      type: 'number',
      correctAnswer: angle.value,
      icon: '📐'
    };
  }

  generateCircleQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const radius = (Math.floor(seed * 7919) % 10) + 1;
    
    if (outcome.includes('circumference')) {
      return {
        question: `What is the circumference of a circle with radius ${radius}? (Use π = 3.14, round to nearest whole)`,
        type: 'number',
        correctAnswer: Math.round(2 * 3.14 * radius),
        icon: '⭕'
      };
    } else {
      return {
        question: `What is the area of a circle with radius ${radius}? (Use π = 3.14, round to nearest whole)`,
        type: 'number',
        correctAnswer: Math.round(3.14 * radius * radius),
        icon: '⭕'
      };
    }
  }

  generateMoneyQuestion(grade, index, outcome, difficulty) {
    const diff = difficulty || 'medium';
    let max = 100;
    if (outcome.includes('₱100') || outcome.includes('100')) max = 100;
    else if (outcome.includes('₱1,000') || outcome.includes('1000')) max = 1000;
    else if (outcome.includes('₱10,000') || outcome.includes('10000')) max = 10000;
    else if (grade === 1) max = 100;
    else if (grade === 2) max = 1000;
    else if (grade >= 3) max = 10000;

    if (diff === 'easy') max = Math.max(50, Math.round(max * 0.3));
    else if (diff === 'hard') max = Math.round(max * 1.5);

    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    let amount1, amount2;
    
    if (grade === 1) {
      const cap = Math.min(max, 100);
      amount1 = Math.floor((seed * 7919) % (cap - 1)) + 1;
      const maxAmount2 = Math.min(cap - amount1, cap - 1);
      amount2 = Math.floor((seed * 9973) % Math.max(maxAmount2, 1)) + 1;
    } else {
      amount1 = Math.floor((seed * 7919) % (max / 2)) + 1;
      amount2 = Math.floor((seed * 9973) % (max / 2)) + 1;
    }

    const skill = 'Money (Philippine Peso)';
    const name1 = this.randomName(seed);
    const name2 = this.randomName(seed + 3);
    const scenario = this.randomScenario(seed);
    const item = this.randomItem(scenario, seed);
    const variantRoll = (index * 7 + 11) % 100;
    
    // Filipino-contextualized word problems for all money questions
    const qType = index % 4;
    let question, answer, explanation;
    
    if (qType === 0) {
      question = `${name1} has ₱${amount1}. After buying ${item} at the ${scenario.place} for ₱${Math.min(amount1, amount2)}, how much money is left?`;
      answer = amount1 - Math.min(amount1, amount2);
      explanation = `Step 1: ${name1} starts with ₱${amount1}.\nStep 2: The ${item} costs ₱${Math.min(amount1, amount2)}.\nStep 3: ₱${amount1} - ₱${Math.min(amount1, amount2)} = ₱${answer}.\nThe answer is ₱${answer}.`;
    } else if (qType === 1) {
      const totalAmount = amount1 + amount2;
      if (grade === 1 && totalAmount > 100) {
        amount2 = 100 - amount1;
      }
      question = `${name1} saved ₱${amount1} and ${name2} saved ₱${amount2}. How much did they save together?`;
      answer = amount1 + amount2;
      explanation = `Step 1: ${name1} saved ₱${amount1}.\nStep 2: ${name2} saved ₱${amount2}.\nStep 3: Add: ₱${amount1} + ₱${amount2} = ₱${answer}.\nThe answer is ₱${answer}.`;
    } else if (qType === 2) {
      const cost = Math.max(amount1, amount2);
      const budget = Math.min(amount1, amount2);
      const needed = Math.max(0, cost - budget);
      question = `${item} at the ${scenario.place} costs ₱${cost}. ${name1} only has ₱${budget}. How much more does ${name1} need?`;
      answer = needed;
      explanation = `Step 1: The ${item} costs ₱${cost}.\nStep 2: ${name1} has ₱${budget}.\nStep 3: ₱${cost} - ₱${budget} = ₱${needed}.\n${name1} needs ₱${needed} more.`;
    } else {
      // True/False money question
      const sum = amount1 + amount2;
      const wrongSum = sum + ((seed % 5) + 1);
      const showCorrect = index % 2 === 0;
      const shown = showCorrect ? sum : wrongSum;
      return {
        question: `True or False: ₱${amount1} + ₱${amount2} = ₱${shown}`,
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: showCorrect ? 0 : 1,
        icon: '🪙',
        skill,
        explanation: `₱${amount1} + ₱${amount2} = ₱${sum}. The statement says ₱${shown}, so the answer is ${showCorrect ? 'True' : 'False'}.`
      };
    }
    
    return {
      question: question,
      type: 'number',
      correctAnswer: answer,
      icon: '🪙',
      skill,
      explanation
    };
  }

  generateTimeQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    
    // Grade 1: Non-standard measurement - focus on hours, half-hours, quarter hours, days, weeks, months, years
    if (grade === 1 || (outcome.includes('non-standard') && !outcome.includes('minute') && !outcome.includes('a.m.') && !outcome.includes('p.m.'))) {
      const timeTypes = [
        { type: 'hour', question: (hour) => `The clock shows ${hour} o'clock. What time is it?`, options: (hour) => {
          const options = [`${hour} o'clock`];
          // Generate plausible wrong answers
          if (hour < 12) options.push(`${hour + 1} o'clock`);
          if (hour > 1) options.push(`${hour - 1} o'clock`);
          else options.push('12 o\'clock');
          options.push(`half past ${hour}`);
          return options.slice(0, 4);
        }},
        { type: 'half-hour', question: (hour) => `The clock shows half past ${hour}. What time is it?`, options: (hour) => {
          const options = [`half past ${hour}`];
          options.push(`${hour} o'clock`);
          if (hour < 12) options.push(`${hour + 1} o'clock`);
          else options.push('1 o\'clock');
          if (hour > 1) options.push(`half past ${hour - 1}`);
          else options.push('half past 12');
          return options.slice(0, 4);
        }},
        { type: 'quarter-hour', question: (hour) => `The clock shows quarter past ${hour}. What time is it?`, options: (hour) => [
          `quarter past ${hour}`, `${hour}:15`, `${hour} o'clock`, `half past ${hour}`
        ]},
        { type: 'days', question: (num) => `How many days are in ${num} week${num > 1 ? 's' : ''}?`, options: (num) => {
          const correct = num * 7;
          return [`${correct}`, `${num}`, `${num + 7}`, `${correct + 7}`];
        }},
        { type: 'weeks', question: (num) => `How many weeks are in ${num} month${num > 1 ? 's' : ''}? (Approximate)`, options: (num) => {
          const correct = num * 4;
          return [`${correct}`, `${num}`, `${num * 7}`, `${num * 2}`];
        }},
        { type: 'months', question: (num) => `How many months are in ${num} year${num > 1 ? 's' : ''}?`, options: (num) => {
          const correct = num * 12;
          return [`${correct}`, `${num}`, `${num * 6}`, `${correct + 6}`];
        }}
      ];
      
      const selectedType = timeTypes[index % timeTypes.length];
      const hour = (Math.floor(seed * 7919) % 12) + 1;
      const num = (Math.floor(seed * 9973) % 5) + 1;
      
      if (selectedType.type === 'hour' || selectedType.type === 'half-hour' || selectedType.type === 'quarter-hour') {
        let options = selectedType.options(hour);
        // Find correct answer index
        let correctIndex = 0;
        if (selectedType.type === 'half-hour') {
          correctIndex = options.findIndex(opt => opt.includes(':30') || opt.toLowerCase().includes('half past'));
          if (correctIndex === -1) correctIndex = 0;
        } else if (selectedType.type === 'quarter-hour') {
          correctIndex = options.findIndex(opt => opt.toLowerCase().includes('quarter') || opt.includes(':15'));
          if (correctIndex === -1) correctIndex = 0;
        }
        const correctAnswer = options[correctIndex];
        // Shuffle options but track correct answer
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        const shuffledCorrect = shuffled.indexOf(correctAnswer);
        return {
          question: selectedType.question(hour),
          type: 'multiple-choice',
          options: shuffled,
          correctAnswer: shuffledCorrect === -1 ? 0 : shuffledCorrect,
          icon: '⏰'
        };
      } else {
        const options = selectedType.options(num);
        const correctAnswer = selectedType.type === 'days' ? num * 7 : 
                             selectedType.type === 'weeks' ? num * 4 : 
                             num * 12;
        const correctAnswerStr = correctAnswer.toString();
        // Shuffle but keep track of correct answer
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        const shuffledCorrect = shuffled.indexOf(correctAnswerStr);
        return {
          question: selectedType.question(num),
          type: 'multiple-choice',
          options: shuffled,
          correctAnswer: shuffledCorrect === -1 ? 0 : shuffledCorrect,
          icon: '📅'
        };
      }
    }
    
    // Grade 2+: Time with minutes and a.m./p.m., or elapsed time
    const hour1 = (Math.floor(seed * 7919) % 12) + 1;
    const min1 = Math.floor(seed * 9973) % 60;
    const hour2 = (Math.floor(seed * 7919 * 9973) % 12) + 1;
    const min2 = Math.floor((seed * 7919 * 9973 * 7919) % 60);
    
    if (outcome.includes('elapsed') || outcome.includes('duration') || outcome.includes('between')) {
      const total1 = hour1 * 60 + min1;
      const total2 = hour2 * 60 + min2;
      const diff = Math.abs(total1 - total2);
      return {
        question: `How many minutes are between ${hour1}:${min1.toString().padStart(2, '0')} and ${hour2}:${min2.toString().padStart(2, '0')}?`,
        type: 'number',
        correctAnswer: diff,
        icon: '⏰'
      };
    } else {
      // Grade 2+ time reading - show clock and ask what time it shows
      const period = (index % 2 === 0) ? 'a.m.' : 'p.m.';
      // Generate a time and show it visually (students read the clock)
      // For now, we'll ask them to identify the time from options
      const correctTime = `${hour1}:${min1.toString().padStart(2, '0')} ${period}`;
      return {
        question: `The clock shows ${hour1}:${min1.toString().padStart(2, '0')}. What time is this?`,
        type: 'multiple-choice',
        options: [
          correctTime,
          `${hour1}:${min1.toString().padStart(2, '0')} ${period === 'a.m.' ? 'p.m.' : 'a.m.'}`,
          `${(hour1 % 12) + 1}:${min1.toString().padStart(2, '0')} ${period}`,
          `${hour1}:${(min1 + 1).toString().padStart(2, '0')} ${period}`
        ],
        correctAnswer: 0,
        icon: '⏰'
      };
    }
  }

  generateLengthQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    
    // Grade 1: Use non-standard units (e.g., paper clips, cubes, blocks)
    if (grade === 1 || (outcome.includes('non-standard') && !outcome.includes('cm') && !outcome.includes('meter'))) {
      const units = ['paper clips', 'cubes', 'blocks', 'pencils', 'books'];
      const unit = units[index % units.length];
      const length1 = (Math.floor(seed * 7919) % 10) + 3; // 3-12 units
      const length2 = (Math.floor(seed * 9973) % 10) + 3;
      
      const qType = index % 2;
      if (qType === 0) {
        return {
          question: `A pencil is ${length1} ${unit} long. Another pencil is ${length2} ${unit} long. What is their total length?`,
          type: 'number',
          correctAnswer: length1 + length2,
          icon: '📏'
        };
      } else {
        return {
          question: `A table is ${length1} ${unit} long. A chair is ${length2} ${unit} long. How much longer is the table?`,
          type: 'number',
          correctAnswer: Math.abs(length1 - length2),
          icon: '📏'
        };
      }
    }
    
    // Grade 2+: Standard units (cm, m)
    const length1 = (Math.floor(seed * 7919) % 100) + 1;
    const length2 = (Math.floor(seed * 9973) % 100) + 1;
    
    if (outcome.includes('convert') || outcome.includes('meter')) {
      return {
        question: `If a rope is ${length1} cm and another is ${length2} cm, what is the total length in meters? (Round to 1 decimal)`,
        type: 'number',
        correctAnswer: Math.round(((length1 + length2) / 100) * 10) / 10,
        icon: '📏'
      };
    } else {
      return {
        question: `A stick is ${length1} cm long and another is ${length2} cm long. What is their total length?`,
        type: 'number',
        correctAnswer: length1 + length2,
        icon: '📏'
      };
    }
  }

  generateMassQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const mass1 = (Math.floor(seed * 7919) % 50) + 1;
    const mass2 = (Math.floor(seed * 9973) % 50) + 1;
    
    return {
      question: `A bag weighs ${mass1} kg and another weighs ${mass2} kg. What is the total weight?`,
      type: 'number',
      correctAnswer: mass1 + mass2,
      icon: '⚖️'
    };
  }

  generateVolumeQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const length = (Math.floor(seed * 7919) % 10) + 1;
    const width = (Math.floor(seed * 9973) % 10) + 1;
    const height = (Math.floor(seed * 7919 * 9973) % 10) + 1;
    
    return {
      question: `What is the volume of a rectangular box with length ${length}, width ${width}, and height ${height}?`,
      type: 'number',
      correctAnswer: length * width * height,
      icon: '📦'
    };
  }

  generateDataQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    
    // Grade 1: Pictographs without scale - simple counting of pictures
    if (grade === 1 || (outcome.includes('pictograph') && outcome.includes('without scale'))) {
      const items = ['apples', 'books', 'pencils', 'toys', 'flowers'];
      const item = items[index % items.length];
      const count1 = (Math.floor(seed * 7919) % 8) + 2; // 2-9 items
      const count2 = (Math.floor(seed * 9973) % 8) + 2;
      
      const qType = index % 3;
      if (qType === 0) {
        return {
          question: `In a pictograph, there are ${count1} pictures of ${item}. If each picture represents 1 ${item}, how many ${item} are there?`,
          type: 'number',
          correctAnswer: count1,
          icon: '📊'
        };
      } else if (qType === 1) {
        return {
          question: `In a pictograph, Group A has ${count1} pictures and Group B has ${count2} pictures. How many pictures are there in total?`,
          type: 'number',
          correctAnswer: count1 + count2,
          icon: '📊'
        };
      } else {
        return {
          question: `In a pictograph, Group A has ${count1} pictures and Group B has ${count2} pictures. Which group has more? (Answer with the number of pictures)`,
          type: 'number',
          correctAnswer: Math.max(count1, count2),
          icon: '📊'
        };
      }
    }
    
    // Grade 2+: Bar graphs or pictographs with scale
    const value = (Math.floor(seed * 7919) % 15) + 5;
    const value2 = value * 2;
    
    if (outcome.includes('difference')) {
      return {
        question: `In a bar graph, if one bar shows ${value} and another shows ${value2}, what is the difference?`,
        type: 'number',
        correctAnswer: value,
        icon: '📊'
      };
    } else {
      return {
        question: `In a bar graph, if one bar shows ${value} and another shows ${value2}, what is the total?`,
        type: 'number',
        correctAnswer: value + value2,
        icon: '📊'
      };
    }
  }

  generateProbabilityQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    const total = (Math.floor(seed * 7919) % 10) + 5;
    const favorable = (Math.floor(seed * 9973) % total) + 1;
    
    return {
      question: `In a bag with ${total} marbles, ${favorable} are red. What is the probability of drawing a red marble? (Express as a fraction)`,
      type: 'multiple-choice',
      options: [`${favorable}/${total}`, `${total}/${favorable}`, `${favorable}/${total - favorable}`, '1/2'],
      correctAnswer: 0,
      icon: '🎲'
    };
  }

  generatePatternQuestion(grade, index, outcome) {
    // Grade 1: Simple repeating patterns (colors, shapes, or small numbers)
    if (grade === 1 || (outcome.includes('repeating') && !outcome.includes('increasing') && !outcome.includes('decreasing'))) {
      const repeatingPatterns = [
        // Color/Shape patterns
        { seq: ['🔴', '🔵', '🔴', '🔵'], next: '🔴', type: 'color' },
        { seq: ['🟢', '🟡', '🟢', '🟡'], next: '🟢', type: 'color' },
        { seq: ['🔺', '⬜', '🔺', '⬜'], next: '🔺', type: 'shape' },
        { seq: ['⭕', '⬛', '⭕', '⬛'], next: '⭕', type: 'shape' },
        // Simple number patterns (repeating or simple addition)
        { seq: [2, 4, 2, 4], next: 2, type: 'number' },
        { seq: [1, 3, 1, 3], next: 1, type: 'number' },
        { seq: [5, 10, 5, 10], next: 5, type: 'number' },
        { seq: [1, 2, 3, 1, 2, 3], next: 1, type: 'number' }
      ];
      
      const pattern = repeatingPatterns[index % repeatingPatterns.length];
      const seqStr = pattern.seq.join(', ');
      
      if (pattern.type === 'color' || pattern.type === 'shape') {
        const options = [pattern.next];
        // Add other options
        const allEmojis = ['🔴', '🔵', '🟢', '🟡', '🔺', '⬜', '⭕', '⬛'];
        for (let i = 0; i < 3; i++) {
          const randomEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
          if (!options.includes(randomEmoji)) options.push(randomEmoji);
        }
        options.sort(() => Math.random() - 0.5);
        
        return {
          question: `What comes next in this repeating pattern: ${seqStr}?`,
          type: 'multiple-choice',
          options: options,
          correctAnswer: options.indexOf(pattern.next),
          icon: '🔁'
        };
      } else {
        return {
          question: `What comes next in this repeating pattern: ${seqStr}?`,
          type: 'number',
          correctAnswer: pattern.next,
          icon: '🔁'
        };
      }
    }
    
    // Grade 2+: Increasing/decreasing patterns
    const patterns = [
      { seq: [2, 4, 6, 8], next: 10, type: 'increasing by 2' },
      { seq: [5, 10, 15, 20], next: 25, type: 'increasing by 5' },
      { seq: [1, 3, 5, 7], next: 9, type: 'increasing by 2' },
      { seq: [3, 6, 9, 12], next: 15, type: 'increasing by 3' },
      { seq: [10, 20, 30, 40], next: 50, type: 'increasing by 10' },
      { seq: [4, 8, 12, 16], next: 20, type: 'increasing by 4' },
      { seq: [20, 18, 16, 14], next: 12, type: 'decreasing by 2' },
      { seq: [50, 45, 40, 35], next: 30, type: 'decreasing by 5' }
    ];
    
    const pattern = patterns[index % patterns.length];
    
    return {
      question: `What comes next in this pattern: ${pattern.seq.join(', ')}?`,
      type: 'number',
      correctAnswer: pattern.next,
      icon: '🔁'
    };
  }

  generateProblemSolvingQuestion(grade, index, outcome) {
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 97);
    
    // Grade 1: Apply counting, addition, subtraction, and pattern recognition to solve real-life problems
    // Numbers should be within Grade 1 limits (sums up to 100, both numbers less than 100)
    if (grade === 1 || (outcome.includes('counting') && outcome.includes('addition') && outcome.includes('subtraction'))) {
      let num1, num2;
      
      // Ensure numbers are appropriate for Grade 1
      num1 = (Math.floor(seed * 7919) % 50) + 1; // 1-50
      const maxNum2 = Math.min(100 - num1, 49);
      num2 = (Math.floor(seed * 9973) % maxNum2) + 1; // 1 to (100-num1)
      
      const problemTypes = [
        // Addition problems
        {
          question: `Maria has ${num1} apples and ${num2} oranges. How many fruits does she have in total?`,
          answer: num1 + num2,
          type: 'addition'
        },
        {
          question: `There are ${num1} boys and ${num2} girls in a class. How many students are there?`,
          answer: num1 + num2,
          type: 'addition'
        },
        {
          question: `Mom bought ${num1} cookies and ${num2} candies. How many treats did she buy?`,
          answer: num1 + num2,
          type: 'addition'
        },
        // Subtraction problems
        {
          question: `Juan has ${Math.max(num1, num2)} marbles. Ana has ${Math.min(num1, num2)} marbles. How many more marbles does Juan have?`,
          answer: Math.abs(num1 - num2),
          type: 'subtraction'
        },
        {
          question: `There are ${Math.max(num1, num2)} birds in a tree. ${Math.min(num1, num2)} fly away. How many birds are left?`,
          answer: Math.abs(num1 - num2),
          type: 'subtraction'
        },
        {
          question: `A store has ${Math.max(num1, num2)} toys. They sell ${Math.min(num1, num2)} toys. How many toys are left?`,
          answer: Math.abs(num1 - num2),
          type: 'subtraction'
        },
        // Counting problems
        {
          question: `Count the flowers: 🌸🌸🌸🌸🌸 (there are 5 flowers). If you add ${num1} more flowers, how many flowers are there?`,
          answer: 5 + num1,
          type: 'counting'
        },
        {
          question: `There are ${num1} stars in the sky. ${num2} more stars appear. How many stars are there now?`,
          answer: num1 + num2,
          type: 'counting'
        },
        // Pattern recognition problems
        {
          question: `In the pattern: 2, 4, 6, 8, what comes next? Maria has this many stickers. She gets ${num1} more. How many stickers does she have?`,
          answer: 10 + num1,
          type: 'pattern'
        }
      ];
      
      const problem = problemTypes[index % problemTypes.length];
      
      // For pattern type, simplify the question
      if (problem.type === 'pattern') {
        const patternSeq = [2, 4, 6, 8];
        const nextInPattern = 10;
        return {
          question: `In the pattern: ${patternSeq.join(', ')}, what comes next? Then add ${num1} to that number.`,
          type: 'number',
          correctAnswer: nextInPattern + num1,
          icon: '🔁'
        };
      }
      
      return {
        question: problem.question,
        type: 'number',
        correctAnswer: problem.answer,
        icon: '🍎'
      };
    }
    
    // Grade 2+: More complex problems
    const num1 = (Math.floor(seed * 7919) % 20) + 5;
    const num2 = (Math.floor(seed * 9973) % 20) + 5;
    
    const problemTypes = [
      {
        question: `Maria has ${num1} apples and ${num2} oranges. How many fruits does she have in total?`,
        answer: num1 + num2
      },
      {
        question: `Juan has ${num1} marbles. Ana has ${num2} marbles. How many more marbles does Juan have?`,
        answer: Math.max(0, num1 - num2)
      },
      {
        question: `There are ${num1} boys and ${num2} girls in a class. How many students are there?`,
        answer: num1 + num2
      },
      {
        question: `A box contains ${num1} red balls and ${num2} blue balls. How many balls are in the box?`,
        answer: num1 + num2
      }
    ];
    
    const problem = problemTypes[index % problemTypes.length];
    
    return {
      question: problem.question,
      type: 'number',
      correctAnswer: problem.answer,
      icon: '🍎'
    };
  }

  generatePolygonQuestion(grade, index, outcome) {
    const polygons = [
      { name: 'triangle', sides: 3 },
      { name: 'square', sides: 4 },
      { name: 'rectangle', sides: 4 },
      { name: 'pentagon', sides: 5 },
      { name: 'hexagon', sides: 6 }
    ];
    
    const polygon = polygons[index % polygons.length];
    
    return {
      question: `How many sides does a ${polygon.name} have?`,
      type: 'number',
      correctAnswer: polygon.sides,
      icon: '🔷'
    };
  }

  generateTransformationQuestion(grade, index, outcome) {
    const transformations = [
      { type: 'reflection', description: 'mirror image' },
      { type: 'rotation', description: 'turned around a point' },
      { type: 'translation', description: 'slid to a new position' }
    ];
    
    const trans = transformations[index % transformations.length];
    
    return {
      question: `What type of transformation creates a ${trans.description}?`,
      type: 'multiple-choice',
      options: ['Reflection', 'Rotation', 'Translation', 'Dilation'],
      correctAnswer: transformations.indexOf(trans),
      icon: '🔄'
    };
  }

  generateDefaultQuestion(grade, index, category) {
    // Fallback to basic addition
    return this.generateAdditionQuestion(grade, index, `perform addition up to ${grade === 1 ? 100 : 1000}`);
  }

  // Helper methods
  getOrdinals(max) {
    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
    if (max > 10) {
      for (let i = 11; i <= max; i++) {
        const suffix = i % 10 === 1 && i !== 11 ? 'st' : i % 10 === 2 && i !== 12 ? 'nd' : i % 10 === 3 && i !== 13 ? 'rd' : 'th';
        ordinals.push(i + suffix);
      }
    }
    return ordinals;
  }

  numberToWords(num) {
    // Support at least 0–1000; Grade 1 uses up to 100
    const ones = [
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
      'sixteen',
      'seventeen',
      'eighteen',
      'nineteen'
    ];
    const tens = [
      '',
      '',
      'twenty',
      'thirty',
      'forty',
      'fifty',
      'sixty',
      'seventy',
      'eighty',
      'ninety'
    ];

    if (num < 20) {
      return ones[num];
    }
    if (num < 100) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      return o === 0 ? tens[t] : `${tens[t]}-${ones[o]}`;
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      if (rest === 0) return `${ones[h]} hundred`;
      return `${ones[h]} hundred ${this.numberToWords(rest)}`;
    }
    // Fallback for larger numbers – use locale string
    return num.toLocaleString();
  }

  generateFractionOptions(num, den) {
    const simplified = this.simplifyFraction(num, den);
    const options = [`${simplified.num}/${simplified.den}`];
    
    // Generate wrong options
    options.push(`${num}/${den}`);
    options.push(`${num + 1}/${den}`);
    options.push(`${num}/${den + 1}`);
    
    // Remove duplicates and ensure 4 options
    const unique = [...new Set(options)];
    while (unique.length < 4) {
      unique.push(`${Math.floor(Math.random() * 10) + 1}/${Math.floor(Math.random() * 10) + 2}`);
    }
    
    return unique.slice(0, 4).sort(() => Math.random() - 0.5);
  }

  simplifyFraction(num, den) {
    const gcd = this.gcd(num, den);
    return {
      num: num / gcd,
      den: den / gcd
    };
  }

  gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  generateProblemSolvingQuestion(grade, index, outcome, difficulty) {
    const diff = difficulty || 'medium';
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 137);
    const name1 = this.randomName(seed);
    const name2 = this.randomName(seed + 5);
    const scenario = this.randomScenario(seed);
    const item = this.randomItem(scenario, seed);

    let maxNum = grade <= 2 ? 50 : grade <= 4 ? 500 : 5000;
    if (diff === 'easy') maxNum = Math.round(maxNum * 0.3);
    else if (diff === 'hard') maxNum = Math.round(maxNum * 1.5);

    const a = (Math.floor(seed * 7919) % maxNum) + 1;
    const b = (Math.floor(seed * 9973) % Math.min(a, maxNum)) + 1;
    
    const problemType = index % 3;
    if (problemType === 0) {
      const answer = a + b;
      return {
        question: `${name1} has ${a} pesos. ${name2} gave ${name1} ${b} more pesos. How much money does ${name1} have now?`,
        type: 'number',
        correctAnswer: answer,
        icon: '🧩',
        skill: 'Word Problems',
        explanation: `Step 1: ${name1} starts with ₱${a}.\nStep 2: ${name2} gives ₱${b} more.\nStep 3: ₱${a} + ₱${b} = ₱${answer}.\nThe answer is ₱${answer}.`
      };
    } else if (problemType === 1) {
      const answer = a - b;
      return {
        question: `There were ${a} ${item} at the ${scenario.place}. ${b} were sold. How many ${item} are left?`,
        type: 'number',
        correctAnswer: answer,
        icon: '🧩',
        skill: 'Word Problems',
        explanation: `Step 1: Start with ${a} ${item}.\nStep 2: ${b} were sold.\nStep 3: ${a} - ${b} = ${answer}.\nThe answer is ${answer}.`
      };
    } else {
      const factor = Math.min(12, (seed % 8) + 2);
      const answer = factor * b;
      return {
        question: `${name1} bought ${factor} packs of ${item} at the ${scenario.place}. Each pack has ${b} pieces. How many pieces of ${item} does ${name1} have?`,
        type: 'number',
        correctAnswer: answer,
        icon: '🧩',
        skill: 'Word Problems',
        explanation: `Step 1: ${name1} has ${factor} packs.\nStep 2: Each pack has ${b} pieces.\nStep 3: ${factor} × ${b} = ${answer}.\nThe answer is ${answer}.`
      };
    }
  }

  generateDefaultQuestion(grade, index, category, difficulty) {
    const diff = difficulty || 'medium';
    const seed = (Math.floor(Math.random() * 1000000)) + (index * 137);
    let max = grade <= 2 ? 50 : grade <= 4 ? 500 : 5000;
    if (diff === 'easy') max = Math.round(max * 0.3);
    else if (diff === 'hard') max = Math.round(max * 1.5);

    const a = (Math.floor(seed * 7919) % max) + 1;
    const b = (Math.floor(seed * 9973) % max) + 1;

    if (index % 2 === 0) {
      const answer = a + b;
      return {
        question: `What is ${a} + ${b}?`,
        type: 'number',
        correctAnswer: answer,
        icon: '📝',
        skill: category || 'Mathematics',
        explanation: `${a} + ${b} = ${answer}.`
      };
    } else {
      const larger = Math.max(a, b);
      const smaller = Math.min(a, b);
      const answer = larger - smaller;
      return {
        question: `What is ${larger} - ${smaller}?`,
        type: 'number',
        correctAnswer: answer,
        icon: '📝',
        skill: category || 'Mathematics',
        explanation: `${larger} - ${smaller} = ${answer}.`
      };
    }
  }

  initializeTemplates() {
    // Can be extended with more templates
    return {};
  }
}

module.exports = CurriculumQuestionGenerator;


