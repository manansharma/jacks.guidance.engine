/*
 * Copyright (c) 2015, Codiscope and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Oracle designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Oracle in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */

module.exports = {
  ID: "TR-JS-EXPRESS-GUID-066",
  EVIDENCES: {
    "add-secure-attribute": {
      "title": "Add Secure Attribute",
      "template": "evidence.add.secure.mustache"
    },
    "set-secure-to-true-on-creation": {
      "title": "Set Secure to True on Creation",
      "template": "evidence.set.secure.true.on.creation.mustache"
    },
    "set-secure-to-true-in-a-separate-call": {
      "title": "Set Secure to True in a Separate Call",
      "template": "evidence.set.secure.true.separate.call.mustache"
    }
  }
};
